export const buildDocumentFilter = (query: any) => {
  const {
    category,
    subType,
    department,
    status,
    createdBy,
    fromDate,
    toDate,
    keyword,
  } = query;

  const filter: any = {};

  if (category) filter.category = category;
  if (subType) filter.subType = subType;
  if (department) filter.department = department;
  if (status) filter.status = status;
  if (createdBy) filter.createdBy = createdBy;

  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }

  if (keyword) {
    filter.$or = [
      { title: { $regex: keyword, $options: "i" } },
      { documentCode: { $regex: keyword, $options: "i" } },
    ];
  }

  return filter;
};
