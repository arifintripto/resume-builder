import { Resume, uid } from './types'

/** The blank-slate template: obviously placeholder content in the real layout. */
export function johnDoeResume(): Resume {
  return {
    name: 'John Doe',
    tagline: ['Professional Title', 'City, Country'],
    contacts: [
      'john.doe@example.com',
      'linkedin.com/in/johndoe',
      '+1 555 000 0000',
      '123 Main Street, City',
    ],
    photo: null,
    accent: '#1a1a1a',
    fontScale: 100,
    sections: [
      {
        id: uid(),
        title: 'Summary',
        entries: [
          {
            id: uid(),
            text: 'Two or three sentences introducing yourself: your profession, years of experience, your strongest proven results, and the kind of value you bring. Keep it specific — numbers and outcomes beat adjectives.',
            bullets: [],
          },
        ],
      },
      {
        id: uid(),
        title: 'Experience',
        entries: [
          {
            id: uid(),
            title: 'Job Title - Company Name',
            meta: 'City, January 2023 – Present',
            bullets: [
              'Describe an achievement, not a duty: what you did, how, and the measurable result.',
              'Start each point with a strong verb — built, led, reduced, delivered.',
              'Include numbers wherever possible: team size, users, revenue, time saved.',
            ],
          },
          {
            id: uid(),
            title: 'Previous Job Title - Previous Company',
            meta: 'City, June 2020 – December 2022',
            bullets: [
              'Two or three points are enough for older roles.',
              'Keep the most impressive, most relevant achievements.',
            ],
          },
        ],
      },
      {
        id: uid(),
        title: 'Education',
        entries: [
          {
            id: uid(),
            title: 'Degree Name - University Name',
            meta: 'City, 2020',
            bullets: [],
          },
        ],
      },
      {
        id: uid(),
        title: 'Skills',
        entries: [
          {
            id: uid(),
            bullets: [
              '<strong>Core:</strong> Your main professional skills, separated by commas',
              '<strong>Tools:</strong> Software and tools you work with',
            ],
          },
        ],
      },
    ],
  }
}
