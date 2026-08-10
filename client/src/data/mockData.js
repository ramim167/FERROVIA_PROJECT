export const stations = [
  'Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Sylhet', 'Rangpur',
  'Mymensingh', 'Cumilla', 'Brahmanbaria', 'Feni', 'Noakhali', 'Jashore'
]

export const trains = [
  { id: 1, code: '701', name: 'Subarna Express', from: 'Dhaka', to: 'Chattogram', depart: '07:00', arrive: '12:30', duration: '5h 30m', days: 'Sat–Thu', rating: 4.8, type: 'Intercity', classes: [
    { name: 'Shovan', code: 'S_CHAIR', fare: 460, available: 37 },
    { name: 'Snigdha', code: 'SN', fare: 850, available: 21 },
    { name: 'AC Seat', code: 'AC_S', fare: 1025, available: 14 }
  ]},
  { id: 2, code: '702', name: 'Sonar Bangla Express', from: 'Dhaka', to: 'Chattogram', depart: '16:30', arrive: '21:40', duration: '5h 10m', days: 'Sat–Thu', rating: 4.9, type: 'Intercity', classes: [
    { name: 'Shovan', code: 'S_CHAIR', fare: 490, available: 42 },
    { name: 'Snigdha', code: 'SN', fare: 900, available: 18 },
    { name: 'AC Seat', code: 'AC_S', fare: 1100, available: 8 }
  ]},
  { id: 3, code: '759', name: 'Padma Express', from: 'Dhaka', to: 'Rajshahi', depart: '22:45', arrive: '04:30', duration: '5h 45m', days: 'Daily', rating: 4.7, type: 'Express', classes: [
    { name: 'Shovan', code: 'S_CHAIR', fare: 405, available: 55 },
    { name: 'Snigdha', code: 'SN', fare: 780, available: 25 },
    { name: 'AC Berth', code: 'AC_B', fare: 1280, available: 6 }
  ]},
  { id: 4, code: '717', name: 'Jayantika Express', from: 'Dhaka', to: 'Sylhet', depart: '11:15', arrive: '18:30', duration: '7h 15m', days: 'Daily', rating: 4.6, type: 'Mail', classes: [
    { name: 'Shovan', code: 'S_CHAIR', fare: 375, available: 63 },
    { name: 'First Class Chair', code: 'F_CHAIR', fare: 640, available: 16 },
    { name: 'AC Seat', code: 'AC_S', fare: 910, available: 11 }
  ]}
]

export const popularRoutes = [
  ['Dhaka', 'Chattogram', 'From ৳460'],
  ['Dhaka', 'Rajshahi', 'From ৳405'],
  ['Dhaka', 'Sylhet', 'From ৳375'],
  ['Dhaka', 'Khulna', 'From ৳510']
]
