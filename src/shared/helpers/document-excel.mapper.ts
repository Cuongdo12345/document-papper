
export const formatDate = (date: Date) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};

export const mapDocumentToExcelRows = (doc: any) => {
  const items = doc.meta?.items || [];

  if (!items.length) {
    return [
      {
        documentCode: doc.documentCode,
        departmentName: doc.department?.name || "",
        subType: doc.subType,
        title: doc.title,
        deviceName: "",
        quantity: "",
        note: "",
        proposalDate: formatDate(doc.createdAt),
        serviceDate: "",
        actualCost: "",
      },
    ];
  }

  return items.map((item: any) => ({
    documentCode: doc.documentCode,
    departmentName: doc.department?.name || "",
    subType: doc.subType,
    title: doc.title,
    deviceName: item.deviceName || "",
    quantity: item.quantity || 1,
    note: item.note || "",
    proposalDate: formatDate(doc.createdAt),
    serviceDate: "",
    actualCost: "",
  }));
};