// src/hooks/useStaff.js
//
// import { useStaff } from '../hooks/useStaff';
// const { role, restaurantId, restaurantName, restaurantBrand, loading } = useStaff();

import { useContext } from 'react';
import { StaffContext } from '../context/staffContextDef';

export function useStaff() {
  const context = useContext(StaffContext);
  if (context === undefined) {
    throw new Error("useStaff doit être utilisé à l'intérieur de <StaffProvider>");
  }
  return context;
}