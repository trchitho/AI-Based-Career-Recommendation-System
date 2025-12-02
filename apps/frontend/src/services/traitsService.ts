// src/services/traitsService.ts
import api from '../lib/api';
import type { TraitSnapshot } from '../types/traits';

export async function getMyTraits(): Promise<TraitSnapshot> {
  const { data } = await api.get('/api/users/me/traits');
  return data;
}
