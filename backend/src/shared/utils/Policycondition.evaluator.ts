import ApiError from "../errors/ApiError";

/* =====================================================================
   SAFE POLICY CONDITION EVALUATOR
   =====================================================================
   Tách từ `authorizePermission.middleware.ts` ra file dùng chung — vì
   `rbac.service.ts` (createPolicy/updatePolicy) giờ cần dùng LẠI evaluator
   này để validate cú pháp `condition` NGAY LÚC TẠO/SỬA Policy (thay vì để
   policy sai cú pháp lưu vào DB, chỉ lộ lỗi khi có request thật chạy tới
   nhánh ABAC — lúc đó đã bị nuốt lỗi và policy chỉ âm thầm không bao giờ
   pass, rất khó debug cho người tạo policy).

   Không đổi logic evaluator — giữ nguyên toàn bộ ngữ pháp giới hạn đã thiết
   kế để vá lỗ hổng RCE (B1): chỉ hỗ trợ truy cập field lồng nhau của
   "user"/"resource", so sánh, logic &&/||/!, literal chuỗi/số/boolean/null,
   ngoặc đơn — KHÔNG hỗ trợ gọi hàm tuỳ ý.
===================================================================== */

export type PolicyContext = { user: any; resource: any };

type Token = { type: "ident" | "string" | "number" | "op" | "(" | ")" | "."; value: string };

const tokenizePolicyCondition = (input: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;

  const isDigit = (c: string) => /[0-9]/.test(c);
  const isIdentStart = (c: string) => /[A-Za-z_$]/.test(c);
  const isIdentPart = (c: string) => /[A-Za-z0-9_$]/.test(c);

  while (i < input.length) {
    const c = input[i];

    if (/\s/.test(c)) {
      i++;
      continue;
    }

    if (c === "(" || c === ")" || c === ".") {
      tokens.push({ type: c as "(" | ")" | ".", value: c });
      i++;
      continue;
    }

    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      let str = "";
      while (j < input.length && input[j] !== quote) {
        str += input[j];
        j++;
      }
      tokens.push({ type: "string", value: str });
      i = j + 1;
      continue;
    }

    if (isDigit(c)) {
      let j = i;
      let num = "";
      while (j < input.length && /[0-9.]/.test(input[j])) {
        num += input[j];
        j++;
      }
      tokens.push({ type: "number", value: num });
      i = j;
      continue;
    }

    if (isIdentStart(c)) {
      let j = i;
      let ident = "";
      while (j < input.length && isIdentPart(input[j])) {
        ident += input[j];
        j++;
      }
      tokens.push({ type: "ident", value: ident });
      i = j;
      continue;
    }

    const three = input.slice(i, i + 3);
    if (three === "===" || three === "!==") {
      tokens.push({ type: "op", value: three });
      i += 3;
      continue;
    }

    const two = input.slice(i, i + 2);
    if (["==", "!=", ">=", "<=", "&&", "||"].includes(two)) {
      tokens.push({ type: "op", value: two });
      i += 2;
      continue;
    }

    if (["!", "<", ">"].includes(c)) {
      tokens.push({ type: "op", value: c });
      i++;
      continue;
    }

    throw ApiError.badRequest(
      `Policy condition chứa ký tự không hợp lệ: "${c}" (vị trí ${i})`
    );
  }

  return tokens;
};

class PolicyConditionParser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek() {
    return this.tokens[this.pos];
  }
  private next() {
    return this.tokens[this.pos++];
  }
  private expect(type: Token["type"]) {
    const t = this.next();
    if (!t || t.type !== type) {
      throw ApiError.badRequest(
        `Policy condition sai cú pháp gần vị trí token #${this.pos}`
      );
    }
    return t;
  }

  parse(): any {
    const expr = this.parseOr();
    if (this.pos !== this.tokens.length) {
      throw ApiError.badRequest("Policy condition có token dư thừa không parse được");
    }
    return expr;
  }

  private parseOr(): any {
    let left = this.parseAnd();
    while (this.peek()?.type === "op" && this.peek()!.value === "||") {
      this.next();
      left = { op: "||", left, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): any {
    let left = this.parseEquality();
    while (this.peek()?.type === "op" && this.peek()!.value === "&&") {
      this.next();
      left = { op: "&&", left, right: this.parseEquality() };
    }
    return left;
  }

  private parseEquality(): any {
    let left = this.parseRelational();
    while (this.peek()?.type === "op" && ["===", "!==", "==", "!="].includes(this.peek()!.value)) {
      const op = this.next()!.value;
      left = { op, left, right: this.parseRelational() };
    }
    return left;
  }

  private parseRelational(): any {
    let left = this.parseUnary();
    while (this.peek()?.type === "op" && [">", "<", ">=", "<="].includes(this.peek()!.value)) {
      const op = this.next()!.value;
      left = { op, left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): any {
    if (this.peek()?.type === "op" && this.peek()!.value === "!") {
      this.next();
      return { op: "!", operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): any {
    const t = this.peek();
    if (!t) throw ApiError.badRequest("Policy condition thiếu token");

    if (t.type === "(") {
      this.next();
      const expr = this.parseOr();
      this.expect(")");
      return expr;
    }

    if (t.type === "string") {
      this.next();
      return { literal: t.value };
    }

    if (t.type === "number") {
      this.next();
      return { literal: Number(t.value) };
    }

    if (t.type === "ident") {
      if (t.value === "true") {
        this.next();
        return { literal: true };
      }
      if (t.value === "false") {
        this.next();
        return { literal: false };
      }
      if (t.value === "null") {
        this.next();
        return { literal: null };
      }

      // CHỈ cho phép truy cập gốc "user"/"resource" — chặn ngay ở bước
      // parse, không để lọt xuống evaluator.
      if (t.value !== "user" && t.value !== "resource") {
        throw ApiError.badRequest(
          `Policy condition chỉ được truy cập "user"/"resource", nhận "${t.value}"`
        );
      }

      const path = [this.next()!.value];
      while (this.peek()?.type === ".") {
        this.next();
        path.push(this.expect("ident").value);
      }
      return { path };
    }

    throw ApiError.badRequest(`Policy condition sai cú pháp tại token "${t.value}"`);
  }
}

const resolvePolicyPath = (path: string[], ctx: PolicyContext): any => {
  const [root, ...rest] = path;
  let value: any = ctx[root as "user" | "resource"];
  for (const key of rest) {
    if (value === undefined || value === null) return undefined;
    value = value[key];
  }
  return value;
};

/**
 * So sánh 2 giá trị cho ===/!==/==/!=. Nếu 1 trong 2 vế là object (vd
 * ObjectId của Mongoose), dùng `String(...)` (coercion built-in, KHÔNG
 * phải gọi method tuỳ ý do dữ liệu policy kiểm soát) để giữ hành vi tương
 * đương so sánh `.toString()` như code cũ, mà không cần cho phép gọi hàm
 * tuỳ ý trong ngữ pháp.
 */
const evaluateEquality = (op: string, left: any, right: any): boolean => {
  const bothObjects =
    typeof left === "object" && left !== null && typeof right === "object" && right !== null;

  const strictEqual = bothObjects ? String(left) === String(right) : left === right;
  const looseEqual = bothObjects ? String(left) === String(right) : left == right;

  switch (op) {
    case "===":
      return strictEqual;
    case "!==":
      return !strictEqual;
    case "==":
      return looseEqual;
    case "!=":
      return !looseEqual;
    default:
      throw ApiError.badRequest(`Toán tử không hỗ trợ: ${op}`);
  }
};

const evaluatePolicyNode = (node: any, ctx: PolicyContext): any => {
  if ("literal" in node) return node.literal;
  if ("path" in node) return resolvePolicyPath(node.path, ctx);

  if (node.op === "!") return !evaluatePolicyNode(node.operand, ctx);
  if (node.op === "&&") return evaluatePolicyNode(node.left, ctx) && evaluatePolicyNode(node.right, ctx);
  if (node.op === "||") return evaluatePolicyNode(node.left, ctx) || evaluatePolicyNode(node.right, ctx);

  const left = evaluatePolicyNode(node.left, ctx);
  const right = evaluatePolicyNode(node.right, ctx);

  if (["===", "!==", "==", "!="].includes(node.op)) {
    return evaluateEquality(node.op, left, right);
  }

  switch (node.op) {
    case ">":
      return left > right;
    case "<":
      return left < right;
    case ">=":
      return left >= right;
    case "<=":
      return left <= right;
    default:
      throw ApiError.badRequest(`Toán tử không hỗ trợ: ${node.op}`);
  }
};

/**
 * Parse `condition` thành AST và validate cú pháp — KHÔNG evaluate.
 * Dùng ở `rbac.service.ts` (createPolicy/updatePolicy) để "dry-run" validate
 * NGAY LÚC LƯU, ném lỗi 400 sớm nếu cú pháp sai, thay vì để policy hỏng nằm
 * im trong DB tới khi có request thật chạm nhánh ABAC.
 */
export const assertPolicyConditionSyntaxValid = (condition: string): void => {
  const tokens = tokenizePolicyCondition(condition);
  new PolicyConditionParser(tokens).parse();
};

/** Đánh giá 1 `Policy.condition` an toàn — KHÔNG dùng `eval`/`Function`/`vm`. */
export const evaluatePolicyConditionSafely = (condition: string, ctx: PolicyContext): boolean => {
  const tokens = tokenizePolicyCondition(condition);
  const ast = new PolicyConditionParser(tokens).parse();
  return !!evaluatePolicyNode(ast, ctx);
};