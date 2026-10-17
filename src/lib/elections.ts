// Konstanta pemilihan — modul ini aman dipakai di client (tanpa dependensi server).
export type Election = 'osis' | 'mpk';

export const ELECTIONS: Election[] = ['osis', 'mpk'];

export const ELECTION_LABEL: Record<Election, string> = {
	osis: 'Ketua OSIS',
	mpk: 'Ketua MPK'
};
