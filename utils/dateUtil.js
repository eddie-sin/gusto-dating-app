exports.isNewDay = (lastDate) => {
  const now = new Date();
  return now.toDateString() !== new Date(lastDate).toDateString();
};
