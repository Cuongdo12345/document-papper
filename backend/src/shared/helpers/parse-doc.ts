
//Format chuỗi import excel chỗ Kiểm tra
//Drum | SL:2 | 120000; Gạt | SL:1 | 50000
export const parseInspectionJSONLike = (text?: string) => {
  if (!text) return null;

  const items: any[] = [];
  let totalAmount = 0;

  const parts = text.split(";"); // tách từng item

  for (const part of parts) {
    const fields = part.split("|").map(s => s.trim());

    let description = "";
    let quantity = 0;
    let unitPrice = 0;

    for (const f of fields) {
      if (!f) continue;

      // description (text đầu tiên)
      if (!description) {
        description = f;
        continue;
      }

      // SL
      if (f.toLowerCase().includes("sl")) {
        quantity = Number(f.replace(/\D/g, ""));
      }

      // giá
      else if (/\d+/.test(f)) {
        unitPrice = Number(f.replace(/\D/g, ""));
      }
    }

    const totalPrice = quantity * unitPrice;
    totalAmount += totalPrice;

    items.push({
      description,
      quantity,
      unitPrice,
      totalPrice,
    });
  }

  return {
    inspectionResult: items.map(i => i.description).join(", "),
    items,
    totalAmount,
  };
};


//Kiểm tra chuỗi để export phần excel theo format
export const buildInspectionText = (items: any[]) => {
  if (!items || !items.length){
    return {
        text: "",
        total: 0
    }
  } 

  let total = 0;

  const text = items
    .map((item) => {
      const quantity = item.quantity || 0;
      const unitPrice = item.unitPrice || 0;
      const itemTotal = quantity * unitPrice;

      total += itemTotal;

      return `${item.description || ""} | SL:${quantity} | ${unitPrice}`;
    })
    .join("; ");

  return {
    text,
    total,
  };
};