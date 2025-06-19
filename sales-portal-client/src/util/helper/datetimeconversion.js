export const formatTimeDifference = (start, end) => {
  const startTime = new Date(start);
  const endTime = new Date(end);
  const diffMs = endTime - startTime;

  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(
    (diffMs % (1000 * 60 * 60)) / (1000 * 60),
  );

  if (diffHrs > 0) {
    return `${diffHrs}hr ${diffMins}min`;
  }
  return `${diffMins}min`;
};
