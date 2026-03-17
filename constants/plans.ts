export type ReadingPlan = {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  days: {
    day: number;
    reference: string;
    bookShort: string;
    chapter: number;
  }[];
};

export const plans: ReadingPlan[] = [
  {
    id: 'yeni-ahit-30',
    title: 'Yeni Ahit 30 Günde',
    description: "Yeni Ahit'i 30 günde tamamla",
    totalDays: 30,
    days: [
      { day: 1, reference: 'Matta 1-2', bookShort: 'Mat', chapter: 1 },
      { day: 2, reference: 'Matta 3-4', bookShort: 'Mat', chapter: 3 },
      { day: 3, reference: 'Matta 5-7', bookShort: 'Mat', chapter: 5 },
      { day: 4, reference: 'Matta 8-9', bookShort: 'Mat', chapter: 8 },
      { day: 5, reference: 'Matta 10-11', bookShort: 'Mat', chapter: 10 },
      { day: 6, reference: 'Matta 12-13', bookShort: 'Mat', chapter: 12 },
      { day: 7, reference: 'Matta 14-15', bookShort: 'Mat', chapter: 14 },
      { day: 8, reference: 'Matta 16-18', bookShort: 'Mat', chapter: 16 },
      { day: 9, reference: 'Matta 19-20', bookShort: 'Mat', chapter: 19 },
      { day: 10, reference: 'Matta 21-22', bookShort: 'Mat', chapter: 21 },
      { day: 11, reference: 'Matta 23-24', bookShort: 'Mat', chapter: 23 },
      { day: 12, reference: 'Matta 25-26', bookShort: 'Mat', chapter: 25 },
      { day: 13, reference: 'Matta 27-28', bookShort: 'Mat', chapter: 27 },
      { day: 14, reference: 'Markos 1-3', bookShort: 'Mar', chapter: 1 },
      { day: 15, reference: 'Markos 4-5', bookShort: 'Mar', chapter: 4 },
      { day: 16, reference: 'Markos 6-8', bookShort: 'Mar', chapter: 6 },
      { day: 17, reference: 'Markos 9-10', bookShort: 'Mar', chapter: 9 },
      { day: 18, reference: 'Markos 11-13', bookShort: 'Mar', chapter: 11 },
      { day: 19, reference: 'Markos 14-16', bookShort: 'Mar', chapter: 14 },
      { day: 20, reference: 'Luka 1-2', bookShort: 'Luk', chapter: 1 },
      { day: 21, reference: 'Luka 3-4', bookShort: 'Luk', chapter: 3 },
      { day: 22, reference: 'Luka 5-6', bookShort: 'Luk', chapter: 5 },
      { day: 23, reference: 'Luka 7-8', bookShort: 'Luk', chapter: 7 },
      { day: 24, reference: 'Luka 9-10', bookShort: 'Luk', chapter: 9 },
      { day: 25, reference: 'Luka 11-13', bookShort: 'Luk', chapter: 11 },
      { day: 26, reference: 'Luka 14-16', bookShort: 'Luk', chapter: 14 },
      { day: 27, reference: 'Luka 17-18', bookShort: 'Luk', chapter: 17 },
      { day: 28, reference: 'Luka 19-20', bookShort: 'Luk', chapter: 19 },
      { day: 29, reference: 'Luka 21-22', bookShort: 'Luk', chapter: 21 },
      { day: 30, reference: 'Yuhanna 1-3', bookShort: 'Yuh', chapter: 1 },
    ],
  },
];
