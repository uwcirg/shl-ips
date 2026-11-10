/** Which field the NIOSH autocoder should code */
export type CodingMode = 'Occupation' | 'Industry';

/** One coding suggestion from the NIOSH Industry and Occupation Computerized Coding System */
export interface IOResponse {
	Code: string;
	Title: string;
	Score: number;
}

/** Response body of the autocoder endpoint (a subset of the NIOSH autocoder API response) */
export interface AutocoderResponse {
	Industry: IOResponse[];
	Occupation: IOResponse[];
	Scheme: string;
}

/** Values used when a field hasn't been coded */
export const NOT_CODED: AutocoderResponse = {
	Industry: [
		{
			Code: '000000',
			Title: 'Not Coded – Industry',
			Score: 1
		}
	],
	Occupation: [
		{
			Code: '00-0000',
			Title: 'Not Coded – Occupation',
			Score: 1
		}
	],
	Scheme: 'NAICS 2017 and SOC 2018'
};
