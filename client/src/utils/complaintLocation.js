export const getComplaintLocationAddress = (location) =>
  typeof location === 'string' ? location : (location?.address ?? 'Location not available');

export const getComplaintCoordinates = (complaint) => {
  const coordinates =
    typeof complaint?.location === 'object' ? complaint.location?.coordinates : null;
  if (
    Number.isFinite(coordinates?.lat) &&
    Number.isFinite(coordinates?.lng) &&
    coordinates.lat >= -90 &&
    coordinates.lat <= 90 &&
    coordinates.lng >= -180 &&
    coordinates.lng <= 180
  ) {
    return coordinates;
  }
  if (
    Number.isFinite(complaint?.latitude) &&
    Number.isFinite(complaint?.longitude) &&
    complaint.latitude >= -90 &&
    complaint.latitude <= 90 &&
    complaint.longitude >= -180 &&
    complaint.longitude <= 180
  ) {
    return { lat: complaint.latitude, lng: complaint.longitude };
  }
  return null;
};
