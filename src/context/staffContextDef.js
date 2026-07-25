// src/context/staffContextDef.js
//
// Isolé dans son propre fichier, même raison que subscriptionContextDef.js :
// react-refresh exige qu'un fichier .jsx ne contienne que des composants.

import { createContext } from 'react';

export const StaffContext = createContext(undefined);