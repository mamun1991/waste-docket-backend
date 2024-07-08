import escapeStringRegexp from 'escape-string-regexp';
import {AddedDoc} from '../constants/enums';

const getDefaultFields = doc => {
  let fields = [];
  switch (doc) {
    default:
      fields = ['name', 'accountType'];
      break;
  }
  return fields;
};
const verifyFields = (inputFields: Array<String>, doc) => {
  let fields: any;
  switch (doc) {
    default:
      fields = ['name', 'accountType'];
      inputFields = inputFields.filter(field => fields.includes(field));
      break;
  }
  return inputFields;
};

export function getBaseQuery(inputs, doc) {
  let fields = inputs.filteredFields.length
    ? verifyFields(inputs.filteredFields, doc)
    : getDefaultFields(doc);
  const baseQuery = {$and: []};
  const keywordsQuery = {$or: []};

  if (doc === AddedDoc.USER) {
    fields = fields.map(field => {
      if (field !== 'accountType') return `personalDetails.${field}`;
      return field;
    });
  }
  if (!inputs.isPlainText || (inputs.isPlainText && inputs.searchText === '')) {
    const safeKeywords = escapeStringRegexp(inputs.searchText);
    const regex = new RegExp(safeKeywords, 'i');
    fields.forEach(key => {
      keywordsQuery.$or.push({[key]: {$regex: regex}});
    });
  } else {
    fields.forEach(key => {
      keywordsQuery.$or.push({[key]: inputs.searchText});
    });
  }
  baseQuery.$and.push(keywordsQuery);
  return baseQuery;
}
