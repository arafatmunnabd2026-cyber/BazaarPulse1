export const pushToDataLayer = (data: any) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(data);
};
