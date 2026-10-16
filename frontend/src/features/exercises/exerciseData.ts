import { Exercise } from '../../types/exercise';

export const EXERCISES: Exercise[] = [
  {
    id: 'seated-knee-extension',
    name: 'Seated Knee Extension',
    category: 'Active Quadriceps Strengthening',
    targetMuscles: ['Rectus Femoris', 'Vastus Medialis', 'Vastus Lateralis'],
    startingPosition: 'Sit upright in a firm, stable chair with your back supported against the backrest and both feet resting flat on the floor at a 90° knee angle.',
    instructions: [
      'Engage your abdominal core and maintain an upright, neutral spine against the chair back.',
      'Slowly straighten your operative knee by contracting your anterior thigh muscles, extending the lower leg upward until it is horizontal.',
      'Pause and hold the knee in full extension (0° to 10° flexion) for 2 to 3 seconds while sustaining a firm quadriceps squeeze.',
      'Under controlled eccentric resistance, slowly lower your foot back to the 90° resting position over 3 to 4 seconds.',
      'Perform 8 to 12 smooth repetitions per set as directed by your physiotherapist.'
    ],
    precautions: [
      'Do not lean backward or lift your thigh off the chair surface to substitute trunk extension for knee extension.',
      'Avoid explosive or jerky kicking motions that can stress the patellar tendon.',
      'Stop immediately if you experience sharp anterior knee pain or joint catching.'
    ],
    hasLiveAssessment: true,
    youtubeId: 'h8UPMnv_BOA',
    youtubeUrl: 'https://www.youtube.com/watch?v=h8UPMnv_BOA',
    thumbnailPlaceholderColor: 'from-teal-500 to-emerald-600',
    recommendedReps: '3 sets of 10 repetitions'
  },
  {
    id: 'quadriceps-sets',
    name: 'Quadriceps Sets',
    category: 'Isometric Quadriceps Activation',
    targetMuscles: ['Vastus Medialis Oblique (VMO)', 'Rectus Femoris'],
    startingPosition: 'Lie flat on your back or sit upright on a firm bed/mat with your legs straight out in front of you.',
    instructions: [
      'Place a small rolled towel under your operative knee if slight cushioning is needed.',
      'Actively contract the muscle on top of your thigh, pressing the back of your knee downward firmly against the mat.',
      'Focus on flattening your knee joint while simultaneously pulling your toes slightly upward toward your shin.',
      'Hold the maximal isometric contraction for 5 full seconds while breathing steadily.',
      'Slowly release the contraction and rest for 3 seconds between repetitions.'
    ],
    precautions: [
      'Do not hold your breath during the static muscle contraction.',
      'Avoid lifting your heel off the mat; the motion should be a pure downward press.',
      'Avoid forceful contractions if acute postoperative swelling is present.'
    ],
    hasLiveAssessment: false,
    youtubeId: '5TUK4uT2nnw',
    youtubeUrl: 'https://www.youtube.com/watch?v=5TUK4uT2nnw',
    thumbnailPlaceholderColor: 'from-sky-500 to-blue-600',
    recommendedReps: '3 sets of 10 holds (5s each)'
  },
  {
    id: 'straight-leg-raise',
    name: 'Straight Leg Raise',
    category: 'Anterior Chain & Hip Flexor Control',
    targetMuscles: ['Rectus Femoris', 'Iliopsoas', 'Tensor Fasciae Latae'],
    startingPosition: 'Lie flat on your back. Bend your non-operative knee to 90° with the foot flat on the mat for lumbar support. Keep the operative leg fully straight.',
    instructions: [
      'Tighten your operative quadriceps muscle to lock the knee in complete extension.',
      'Keeping the knee strictly straight, lift the operative leg smoothly 8 to 12 inches (approx. 30 cm) above the floor.',
      'Pause and hold at the top of the raise for 2 seconds with stable pelvic control.',
      'Slowly lower the leg back down to the mat under control without letting it drop.',
      'Rest briefly between reps to prevent hip flexor cramping.'
    ],
    precautions: [
      'Keep your lower back flat and stabilized against the mat; do not arch your lumbar spine.',
      'If your knee bends (extensor lag) while lifting, discontinue and return to quadriceps sets first.',
      'Do not lift higher than 45° to avoid excessive hip shear.'
    ],
    hasLiveAssessment: false,
    youtubeId: 'U4L_6JEv9Jg',
    youtubeUrl: 'https://www.youtube.com/watch?v=U4L_6JEv9Jg',
    thumbnailPlaceholderColor: 'from-cyan-500 to-teal-600',
    recommendedReps: '2-3 sets of 8-10 repetitions'
  },
  {
    id: 'heel-slides',
    name: 'Heel Slides',
    category: 'Range of Motion & Flexion Mobility',
    targetMuscles: ['Biceps Femoris', 'Semimembranosus', 'Joint Capsule'],
    startingPosition: 'Lie flat on your back on a bed or smooth exercise mat with both legs extended.',
    instructions: [
      'Slide the heel of your operative leg along the surface toward your buttocks, allowing your knee to bend smoothly.',
      'Continue sliding until you feel a gentle, tolerable stretch across the front of your knee joint.',
      'Hold the bent position for 3 to 5 seconds to encourage tissue elongation.',
      'Slowly slide the heel back down until your knee is once again fully straightened.',
      'You may loop a towel under your foot to assist the sliding motion if friction is high.'
    ],
    precautions: [
      'Do not force the knee past comfortable resistance into sharp or throbbing pain.',
      'Ensure the knee tracks in line with your second toe, preventing the knee from bowing inward.',
      'Avoid sudden jerky movements during the return extension phase.'
    ],
    hasLiveAssessment: false,
    youtubeId: '6-anByqnKp8',
    youtubeUrl: 'https://www.youtube.com/watch?v=6-anByqnKp8',
    thumbnailPlaceholderColor: 'from-emerald-500 to-teal-700',
    recommendedReps: '3 sets of 10 repetitions'
  },
  {
    id: 'standing-hamstring-curl',
    name: 'Standing Hamstring Curl',
    category: 'Posterior Chain Strengthening',
    targetMuscles: ['Hamstrings (Biceps Femoris, Semitendinosus)', 'Gastrocnemius'],
    startingPosition: 'Stand tall with feet hip-width apart, holding onto the sturdy back of a chair or kitchen counter for light balance support.',
    instructions: [
      'Keep your standing leg slightly unlocked and maintain an upright posture with shoulders relaxed.',
      'Keeping your thighs aligned together, bend your operative knee and bring your heel upward toward your glutes.',
      'Lift until your knee reaches approximately 90° flexion or your comfortable active limit.',
      'Hold at the peak contraction for 2 seconds, feeling the posterior thigh engage.',
      'Lower your foot back down slowly to the floor over 3 seconds.'
    ],
    precautions: [
      'Avoid letting your operative thigh swing forward in front of the standing thigh.',
      'Do not arch your lower spine or pitch your chest forward during the curl.',
      'Maintain steady balance on the supporting limb without shifting excessive body weight.'
    ],
    hasLiveAssessment: false,
    youtubeId: '7dQTbp2j-E4',
    youtubeUrl: 'https://www.youtube.com/watch?v=7dQTbp2j-E4',
    thumbnailPlaceholderColor: 'from-blue-600 to-indigo-700',
    recommendedReps: '3 sets of 10-12 repetitions'
  },
  {
    id: 'heel-raises',
    name: 'Heel Raises',
    category: 'Calf Strength & Ankle-Knee Stability',
    targetMuscles: ['Gastrocnemius', 'Soleus', 'Achilles Complex'],
    startingPosition: 'Stand upright with feet hip-width apart and toes pointing forward, lightly resting your fingers on a wall or counter for balance.',
    instructions: [
      'Distribute your weight evenly across the balls of both feet.',
      'Slowly rise up onto your tiptoes by pushing through the balls of your feet and engaging your calf muscles.',
      'Reach maximum comfortable height with knees kept straight but not hyperextended.',
      'Hold the elevated position for 2 full seconds while maintaining stability.',
      'Lower your heels back down smoothly to the floor with full control.'
    ],
    precautions: [
      'Do not roll your ankles outward or inward; press evenly through the first and second metatarsal heads.',
      'Avoid rapid bouncing at the bottom of the movement.',
      'Discontinue if you feel pain along the Achilles tendon or plantar fascia.'
    ],
    hasLiveAssessment: false,
    youtubeId: 'dV4Yjv-gsyY',
    youtubeUrl: 'https://www.youtube.com/watch?v=dV4Yjv-gsyY',
    thumbnailPlaceholderColor: 'from-teal-600 to-cyan-700',
    recommendedReps: '3 sets of 12-15 repetitions'
  }
];
