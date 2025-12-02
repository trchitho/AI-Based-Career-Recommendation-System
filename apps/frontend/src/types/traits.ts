// src/types/traits.ts

export interface TraitSnapshot {
  has_test_traits: boolean;
  has_essay_traits: boolean;
  has_fused_traits: boolean;

  riasec_test?: number[];  // length 6, [R,I,A,S,E,C]
  big5_test?: number[];    // length 5, [O,C,E,A,N]

  riasec_essay?: number[];
  big5_essay?: number[];

  riasec_fused?: number[];
  big5_fused?: number[];
}
