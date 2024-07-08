export default async function hasAccess(operatorId, map, mapDoc) {
  if (map?.parentOperator === null) {
    return false;
  }
  if (map?.parentOperator === operatorId) {
    return true;
  }
  if (map?.operatorId === operatorId) {
    return true;
  }

  const parentSiteMapping = await mapDoc.findOne({operator: map?.parentOperator?.toString()});
  hasAccess(parentSiteMapping?.parentOperator, parentSiteMapping, mapDoc);
  return false;
}
