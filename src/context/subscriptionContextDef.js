// src/context/subscriptionContextDef.js
//
// Isolé dans son propre fichier : ne contient ni composant ni hook,
// juste la définition du Context — nécessaire pour que react-refresh
// n'exige pas que SubscriptionProvider.jsx soit "composants uniquement".

import { createContext } from 'react';

export const SubscriptionContext = createContext(undefined);