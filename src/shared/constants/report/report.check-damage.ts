/**
 Mẫu bạn đưa có:
Quốc hiệu
Tên biên bản
Nội dung dạng đoạn
Chữ ký 2 bên
 */

export const buildCheckDamagePDF = (doc: any) => {
  const meta = doc.meta;

  return {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],

    content: [
      {
        columns: [
          {
            width: "*",
            text: "BỆNH VIỆN ...\nKHOA ...",
            bold: true,
          },
          {
            width: "*",
            text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc",
            alignment: "right",
            bold: true,
          },
        ],
      },

      { text: "\nBIÊN BẢN KIỂM TRA TÌNH TRẠNG HƯ HỎNG THIẾT BỊ", alignment: "center", bold: true, fontSize: 14 },
      { text: "\n" },

      {
        text: `Hôm nay, ngày ${new Date(meta.checkDate).toLocaleDateString("vi-VN")}, tại ${meta.location}, chúng tôi gồm:`,
      },

      {
        ul: [
          `Đại diện khoa: ${meta.representatives.departmentRep}`,
          `Người kiểm tra: ${meta.representatives.inspector}`,
        ],
      },

      {
        text: `Tiến hành kiểm tra thiết bị: ${meta.device.name}`,
      },

      {
        text: `Kết quả kiểm tra: ${meta.inspectionResult}`,
      },

      {
        text: `Đề xuất hướng xử lý: ${meta.proposedSolution}`,
      },

      { text: "\n\n" },

      {
        columns: [
          {
            text: "ĐẠI DIỆN KHOA\n(Ký, ghi rõ họ tên)",
            alignment: "center",
          },
          {
            text: "NGƯỜI KIỂM TRA\n(Ký, ghi rõ họ tên)",
            alignment: "center",
          },
        ],
      },
    ],
  };
};
