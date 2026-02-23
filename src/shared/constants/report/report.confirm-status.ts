// report.confirm-status.ts
//Biên bản xác nhận tình trạng (thay mực)
export const buildConfirmStatusPDF = (doc: any) => {
  const meta = doc.meta;

  return {
    pageSize: "A4",
    content: [
      { text: "BIÊN BẢN XÁC NHẬN TÌNH TRẠNG THIẾT BỊ", bold: true, alignment: "center" },
      { text: `Thiết bị: ${meta.device.name}` },
      { text: `Kết quả: ${meta.inspectionResult}` },
      { text: `Đề xuất: ${meta.proposedSolution}` },
    ],
  };
};
