/** Fired after admin POI create/update/delete so map views can refetch immediately. */
export const POI_CHANGED_EVENT = 'poi-changed';

export function notifyPoiChanged() {
  window.dispatchEvent(new Event(POI_CHANGED_EVENT));
}
