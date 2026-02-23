// biên bản kiểm tra hư hỏng

export const buildProposeRepairPDF = (doc: any) => {
  const meta = doc.meta;
  const ref = doc.referenceTo; // biên bản kiểm tra hư hỏng

  return {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],

    content: [
      // ===== HEADER =====
      {
        columns: [
          {
            width: "*",
            text: "BỆNH VIỆN …………\nKHOA …………",
            bold: true,
          },
          {
            width: "*",
            text:
              "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\n" +
              "Độc lập - Tự do - Hạnh phúc",
            alignment: "right",
            bold: true,
          },
        ],
      },

      { text: "\n" },

      // ===== TITLE =====
      {
        text: "GIẤY ĐỀ XUẤT SỬA CHỮA THIẾT BỊ",
        alignment: "center",
        bold: true,
        fontSize: 14,
      },

      { text: "\n" },

      // ===== CĂN CỨ =====
      {
        text: `Căn cứ biên bản kiểm tra tình trạng hư hỏng thiết bị ngày ${
          ref?.meta?.checkDate
            ? new Date(ref.meta.checkDate).toLocaleDateString("vi-VN")
            : "……"
        }.`,
      },

      { text: "\n" },

      // ===== NỘI DUNG ĐỀ XUẤT =====
      {
        text: "Kính đề nghị Phòng Vật tư – Trang thiết bị xem xét sửa chữa các thiết bị sau:",
        bold: true,
      },

      { text: "\n" },

      // ===== TABLE THIẾT BỊ =====
      {
        table: {
          widths: [30, "*", 60, "*"],
          body: [
            [
              { text: "STT", bold: true, alignment: "center" },
              { text: "Tên thiết bị", bold: true },
              { text: "Số lượng", bold: true, alignment: "center" },
              { text: "Ghi chú", bold: true },
            ],

            ...meta.items.map((item: any, index: number) => [
              { text: index + 1, alignment: "center" },
              item.deviceName,
              { text: item.quantity, alignment: "center" },
              item.note || "",
            ]),
          ],
        },
      },

      { text: "\n" },

      // ===== LÝ DO =====
      {
        text: `Lý do đề xuất: ${meta.reason}`,
      },

      { text: "\n\n" },

      // ===== CHỮ KÝ =====
      {
        columns: [
          {
            text: "ĐẠI DIỆN KHOA\n(Ký, ghi rõ họ tên)",
            alignment: "center",
          },
          {
            text:
              `Ngày …… tháng …… năm ……\n` +
              "TRƯỞNG KHOA\n(Ký, ghi rõ họ tên)",
            alignment: "center",
          },
        ],
      },
    ],
  };
};
