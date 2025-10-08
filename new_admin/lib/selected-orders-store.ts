import { create } from "zustand";

interface SelectedOrdersState {
  selectedOrderIds: Set<string>;
  selectedOrganizationId: string | null;
  toggleOrder: (orderId: string, organizationId: string) => void;
  selectOrders: (orderIds: string[]) => void;
  deselectOrders: (orderIds: string[]) => void;
  clearSelection: () => void;
  isSelected: (orderId: string) => boolean;
  getSelectedCount: () => number;
  canSelectOrder: (organizationId: string) => boolean;
  getSelectedOrganizationId: () => string | null;
  selectAllFromOrganization: (orderIds: string[], organizationId: string) => void;
}

export const useSelectedOrdersStore = create<SelectedOrdersState>()((set, get) => ({
  selectedOrderIds: new Set<string>(),
  selectedOrganizationId: null,

  toggleOrder: (orderId: string, organizationId: string) => set((state) => {
    const newSet = new Set(state.selectedOrderIds);

    if (newSet.has(orderId)) {
      // Снимаем выбор
      newSet.delete(orderId);
      // Если больше нет выбранных заказов, сбрасываем организацию
      const newOrgId = newSet.size === 0 ? null : state.selectedOrganizationId;
      return { selectedOrderIds: newSet, selectedOrganizationId: newOrgId };
    } else {
      // Проверяем, можем ли мы выбрать заказ этой организации
      if (state.selectedOrganizationId !== null && state.selectedOrganizationId !== organizationId) {
        // Нельзя выбирать заказы другой организации
        return state;
      }
      // Добавляем в выбор
      newSet.add(orderId);
      return {
        selectedOrderIds: newSet,
        selectedOrganizationId: state.selectedOrganizationId || organizationId
      };
    }
  }),

  selectOrders: (orderIds: string[]) => set((state) => {
    const newSet = new Set(state.selectedOrderIds);
    orderIds.forEach(id => newSet.add(id));
    return { selectedOrderIds: newSet };
  }),

  deselectOrders: (orderIds: string[]) => set((state) => {
    const newSet = new Set(state.selectedOrderIds);
    orderIds.forEach(id => newSet.delete(id));
    const newOrgId = newSet.size === 0 ? null : state.selectedOrganizationId;
    return { selectedOrderIds: newSet, selectedOrganizationId: newOrgId };
  }),

  clearSelection: () => set({ selectedOrderIds: new Set<string>(), selectedOrganizationId: null }),

  isSelected: (orderId: string) => {
    return get().selectedOrderIds.has(orderId);
  },

  getSelectedCount: () => {
    return get().selectedOrderIds.size;
  },

  canSelectOrder: (organizationId: string) => {
    const state = get();
    return state.selectedOrganizationId === null || state.selectedOrganizationId === organizationId;
  },

  getSelectedOrganizationId: () => {
    return get().selectedOrganizationId;
  },

  selectAllFromOrganization: (orderIds: string[], organizationId: string) => set((state) => {
    const newSet = new Set(state.selectedOrderIds);
    orderIds.forEach(id => newSet.add(id));
    return {
      selectedOrderIds: newSet,
      selectedOrganizationId: organizationId
    };
  }),
}));
