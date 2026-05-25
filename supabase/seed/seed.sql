-- ==========================================================================
-- Seed: Core 50 Exercise Catalog + Equipment
-- Generated: 2026-05-24
-- Source: data/exercises/seed-2026.json
--
-- Run AFTER 0001_initial.sql migration.
-- Idempotent: equipment uses ON CONFLICT (name) DO NOTHING.
-- Exercises use ON CONFLICT on a partial unique index on external_id.
--
-- This script runs as the Supabase service_role, bypassing RLS.
-- Equipment and exercises are global catalog data (is_custom = false).
-- ==========================================================================

-- NOTE: The exercises_external_id_unique_catalog index is now managed by
-- migration 0004_exercisedb_external_id_index.sql. The migration must be
-- applied before running this seed script.

-- ==========================================================================
-- Equipment (12 items)
-- ==========================================================================

insert into equipment (name, category, sort_order) values
  ('Barbell', 'barbell', 1)
on conflict (name) do nothing;

insert into equipment (name, category, sort_order) values
  ('Dumbbell', 'dumbbell', 2)
on conflict (name) do nothing;

insert into equipment (name, category, sort_order) values
  ('Cable Machine', 'cable', 3)
on conflict (name) do nothing;

insert into equipment (name, category, sort_order) values
  ('Smith Machine', 'machine', 4)
on conflict (name) do nothing;

insert into equipment (name, category, sort_order) values
  ('Machine (Plate-Loaded)', 'machine', 5)
on conflict (name) do nothing;

insert into equipment (name, category, sort_order) values
  ('Machine (Selectorized)', 'machine', 6)
on conflict (name) do nothing;

insert into equipment (name, category, sort_order) values
  ('Bodyweight', 'bodyweight', 7)
on conflict (name) do nothing;

insert into equipment (name, category, sort_order) values
  ('Resistance Band', 'band', 8)
on conflict (name) do nothing;

insert into equipment (name, category, sort_order) values
  ('Kettlebell', 'kettlebell', 9)
on conflict (name) do nothing;

insert into equipment (name, category, sort_order) values
  ('EZ Bar', 'barbell', 10)
on conflict (name) do nothing;

insert into equipment (name, category, sort_order) values
  ('Pull-up Bar', 'bodyweight', 11)
on conflict (name) do nothing;

insert into equipment (name, category, sort_order) values
  ('Bench', 'other', 12)
on conflict (name) do nothing;


-- ==========================================================================
-- Exercises (50 items)
-- Each references equipment via subquery on name.
-- ==========================================================================

-- ---- CHEST (7) ----

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Barbell Bench Press',
  E'Lie flat on the bench with your eyes under the bar. Grip the bar slightly wider than shoulder width, unrack it, and lower it to your mid-chest with elbows at roughly 45 degrees.\nPress the bar back up in a slight arc toward the rack position, driving through your feet and keeping your shoulder blades pinched together.\nLock out at the top without flaring your elbows, then control the descent for the next rep.',
  'chest',
  'chest',
  '["triceps", "deltoids"]'::jsonb,
  (select id from equipment where name = 'Barbell'),
  false,
  '0001'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Incline Barbell Bench Press',
  E'Set the bench to a 30-45 degree incline. Unrack the bar with a shoulder-width grip and lower it to your upper chest just below the collarbone.\nPress the bar straight up, keeping your back firmly against the pad and your feet flat on the floor.\nControl the bar on the way down, pausing briefly at the chest before pressing again.',
  'chest',
  'chest',
  '["triceps", "deltoids"]'::jsonb,
  (select id from equipment where name = 'Barbell'),
  false,
  '0002'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Dumbbell Bench Press',
  E'Sit on a flat bench with a dumbbell in each hand resting on your thighs, then kick them up as you lie back so each dumbbell is at chest level with palms facing forward.\nPress both dumbbells up until your arms are extended, allowing a slight inward arc so the dumbbells nearly touch at the top.\nLower the dumbbells with control until your upper arms are parallel to the floor, keeping your wrists stacked over your elbows.',
  'chest',
  'chest',
  '["triceps", "deltoids"]'::jsonb,
  (select id from equipment where name = 'Dumbbell'),
  false,
  '0003'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Dumbbell Fly',
  E'Lie on a flat bench holding two dumbbells directly above your chest with a slight bend in your elbows, palms facing each other.\nOpen your arms in a wide arc, lowering the dumbbells out to the sides until you feel a deep stretch across your chest. Keep the bend in your elbows fixed throughout.\nSqueeze your chest to reverse the arc and bring the dumbbells back together above your chest.',
  'chest',
  'chest',
  '["deltoids"]'::jsonb,
  (select id from equipment where name = 'Dumbbell'),
  false,
  '0004'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Cable Crossover',
  E'Set both pulleys to the high position and grab one handle in each hand. Step forward into a split stance so there is tension on the cables with your arms spread wide.\nBring your hands together in a sweeping arc in front of your chest, squeezing your pecs hard at the bottom. Keep a slight bend in your elbows throughout.\nSlowly let the cables pull your arms back to the starting position, feeling the stretch across your chest.',
  'chest',
  'chest',
  '["deltoids"]'::jsonb,
  (select id from equipment where name = 'Cable Machine'),
  false,
  '0005'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Push-Up',
  E'Start in a high plank with hands just outside shoulder width, body in a straight line from head to heels, and core braced.\nLower yourself by bending your elbows until your chest is just above the floor. Keep your elbows at about 45 degrees from your torso.\nPush the ground away to return to the top position, fully extending your arms without letting your hips sag or pike.',
  'chest',
  'chest',
  '["triceps", "deltoids", "abdominals"]'::jsonb,
  (select id from equipment where name = 'Bodyweight'),
  false,
  '0006'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Machine Chest Press',
  E'Adjust the seat height so the handles line up with your mid-chest. Sit back firmly against the pad with your feet flat on the floor.\nPress the handles forward until your arms are fully extended, focusing on squeezing your chest at the end of the movement.\nSlowly return the handles to the start, letting your chest stretch without letting the weight stack slam.',
  'chest',
  'chest',
  '["triceps", "deltoids"]'::jsonb,
  (select id from equipment where name = 'Machine (Selectorized)'),
  false,
  '0007'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

-- ---- BACK (8) ----

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Barbell Deadlift',
  E'Stand with your mid-foot under the bar, feet hip-width apart. Hinge at the hips and grip the bar just outside your knees with either a double overhand or mixed grip.\nDrive through your feet, extend your hips and knees simultaneously, and pull the bar up your shins and thighs until you are standing tall with your shoulders back.\nReverse the movement by pushing your hips back first, then bending your knees once the bar passes them, and return the bar to the floor under control.',
  'back',
  'spinal erectors',
  '["glutes", "hamstrings", "lats", "trapezius"]'::jsonb,
  (select id from equipment where name = 'Barbell'),
  false,
  '0008'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Barbell Bent-Over Row',
  E'Hold a barbell with an overhand grip, hinge forward at the hips until your torso is roughly 45 degrees to the floor, and let the bar hang at arm''s length.\nPull the bar into your lower ribcage by driving your elbows behind you, squeezing your shoulder blades together at the top.\nLower the bar under control back to the hanging position without rounding your lower back.',
  'back',
  'lats',
  '["trapezius", "biceps", "deltoids"]'::jsonb,
  (select id from equipment where name = 'Barbell'),
  false,
  '0009'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Pull-Up',
  E'Hang from a pull-up bar with an overhand grip slightly wider than shoulder width, arms fully extended, and shoulder blades depressed.\nPull yourself up by driving your elbows down toward your hips until your chin clears the bar. Think about pulling the bar to your chest rather than just getting your chin over.\nLower yourself under control to a full dead hang before starting the next rep. Avoid kipping or swinging.',
  'back',
  'lats',
  '["biceps", "trapezius"]'::jsonb,
  (select id from equipment where name = 'Pull-up Bar'),
  false,
  '0010'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Lat Pulldown',
  E'Sit at the lat pulldown machine with your thighs secured under the pads. Grab the wide bar with an overhand grip just outside shoulder width.\nPull the bar down to your upper chest by driving your elbows toward your back pockets. Lean back slightly and squeeze your lats at the bottom.\nLet the bar rise under control, fully extending your arms and allowing your shoulder blades to spread at the top.',
  'back',
  'lats',
  '["biceps", "trapezius"]'::jsonb,
  (select id from equipment where name = 'Cable Machine'),
  false,
  '0011'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Seated Cable Row',
  E'Sit at the cable row station with your feet on the platform and knees slightly bent. Grab the V-handle with both hands, sit up tall, and start with your arms extended.\nPull the handle to your lower ribcage by retracting your shoulder blades and driving your elbows straight back. Keep your torso stationary.\nExtend your arms back to the starting position with control, allowing a slight stretch in your lats without rounding your back.',
  'back',
  'lats',
  '["trapezius", "biceps"]'::jsonb,
  (select id from equipment where name = 'Cable Machine'),
  false,
  '0012'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Dumbbell Single-Arm Row',
  E'Place one knee and the same-side hand on a bench, with the other foot on the floor. Hold a dumbbell in the free hand with your arm hanging straight down.\nRow the dumbbell up to your hip by driving your elbow toward the ceiling. Keep your torso square to the floor and avoid rotating your shoulders.\nLower the dumbbell under control until your arm is fully extended, then repeat for all reps before switching sides.',
  'back',
  'lats',
  '["trapezius", "biceps"]'::jsonb,
  (select id from equipment where name = 'Dumbbell'),
  false,
  '0013'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'T-Bar Row',
  E'Straddle the T-bar apparatus or a barbell loaded in a landmine. Grip the handles or a V-handle placed under the bar, bend at the hips, and let the weight hang.\nPull the weight toward your chest by driving your elbows back and squeezing your shoulder blades together hard at the top.\nLower the weight under control, keeping your lower back braced and your torso angle consistent throughout the set.',
  'back',
  'lats',
  '["trapezius", "biceps"]'::jsonb,
  (select id from equipment where name = 'Barbell'),
  false,
  '0014'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Face Pull',
  E'Attach a rope handle to a cable set at upper-chest height. Grab the rope with both hands using an overhand grip and step back to create tension.\nPull the rope toward your face by flaring your elbows out and back, separating the ends of the rope as they pass your ears. Squeeze your rear delts and external rotators at the end.\nReturn the rope forward under control without letting the weight stack pull you off balance.',
  'back',
  'deltoids',
  '["trapezius"]'::jsonb,
  (select id from equipment where name = 'Cable Machine'),
  false,
  '0015'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

-- ---- LEGS (9) ----

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Barbell Back Squat',
  E'Position the barbell across your upper traps, step back from the rack, and set your feet shoulder-width apart with toes slightly out.\nBrace your core, push your hips back and bend your knees to lower until your hip crease drops below your knee. Keep your chest up and your weight over your midfoot.\nDrive through your whole foot to stand back up, extending your hips and knees together until you are fully upright.',
  'upper legs',
  'quadriceps',
  '["glutes", "hamstrings", "abdominals"]'::jsonb,
  (select id from equipment where name = 'Barbell'),
  false,
  '0016'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Barbell Front Squat',
  E'Rest the barbell on the front of your shoulders in a clean grip or cross-arm grip, elbows high. Step back and set your feet shoulder-width apart.\nDrop straight down by bending your knees and pushing them forward and out, keeping your torso as upright as possible. Descend until your thighs are at least parallel.\nDrive up through your midfoot, keeping your elbows high to prevent the bar from rolling forward.',
  'upper legs',
  'quadriceps',
  '["glutes", "abdominals"]'::jsonb,
  (select id from equipment where name = 'Barbell'),
  false,
  '0017'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Romanian Deadlift',
  E'Hold a barbell at hip height with a shoulder-width overhand grip, feet hip-width apart, and knees slightly bent.\nHinge at the hips and push them straight back, lowering the bar along your thighs and shins until you feel a strong stretch in your hamstrings. Keep your back flat.\nDrive your hips forward to return to standing, squeezing your glutes at the top. The bar stays close to your body the entire time.',
  'upper legs',
  'hamstrings',
  '["glutes", "lats"]'::jsonb,
  (select id from equipment where name = 'Barbell'),
  false,
  '0018'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Leg Press',
  E'Sit in the leg press with your back flat against the pad and place your feet shoulder-width apart on the platform, roughly in the center.\nRelease the safety handles and lower the sled by bending your knees toward your chest until your knees form about a 90-degree angle. Do not let your lower back round off the pad.\nPress the sled back up by driving through your heels and midfoot until your legs are extended but not locked out.',
  'upper legs',
  'quadriceps',
  '["glutes", "hamstrings"]'::jsonb,
  (select id from equipment where name = 'Machine (Plate-Loaded)'),
  false,
  '0019'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Leg Extension',
  E'Sit in the machine with your back against the pad and the roller pad resting just above your ankles. Adjust the backrest so your knees align with the machine''s pivot point.\nExtend your knees to straighten your legs, squeezing your quads hard at the top and pausing briefly.\nLower the weight under control back to the starting position. Do not let the weight stack slam between reps.',
  'upper legs',
  'quadriceps',
  '[]'::jsonb,
  (select id from equipment where name = 'Machine (Selectorized)'),
  false,
  '0020'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Lying Leg Curl',
  E'Lie face down on the leg curl machine with the roller pad positioned just above your heels and your knees slightly off the edge of the bench.\nCurl your heels toward your glutes by contracting your hamstrings. Squeeze at the top and avoid lifting your hips off the pad.\nLower the weight under control, stopping just before your legs are fully straight to keep tension on the hamstrings.',
  'upper legs',
  'hamstrings',
  '["calves"]'::jsonb,
  (select id from equipment where name = 'Machine (Selectorized)'),
  false,
  '0021'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Bulgarian Split Squat',
  E'Stand about two feet in front of a bench holding a dumbbell in each hand. Place the top of your rear foot on the bench behind you.\nLower your body by bending your front knee until your rear knee nearly touches the floor. Keep your front shin roughly vertical and your torso upright.\nDrive through your front foot to stand back up. Complete all reps on one side before switching legs.',
  'upper legs',
  'quadriceps',
  '["glutes", "hamstrings"]'::jsonb,
  (select id from equipment where name = 'Dumbbell'),
  false,
  '0022'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Standing Calf Raise',
  E'Position your shoulders under the pads of a calf raise machine with the balls of your feet on the edge of the platform and your heels hanging off.\nRaise your heels as high as possible by contracting your calves, pausing briefly at the top of the movement.\nLower your heels below the platform level for a full stretch, then repeat without bouncing at the bottom.',
  'lower legs',
  'calves',
  '[]'::jsonb,
  (select id from equipment where name = 'Machine (Selectorized)'),
  false,
  '0023'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Goblet Squat',
  E'Hold a dumbbell or kettlebell vertically against your chest with both hands cupping the top end. Stand with feet slightly wider than shoulder width and toes turned out.\nSit straight down between your knees, keeping the weight close to your chest and your torso as upright as possible. Go as deep as your mobility allows.\nDrive through your whole foot to stand back up, squeezing your glutes at the top.',
  'upper legs',
  'quadriceps',
  '["glutes", "abdominals"]'::jsonb,
  (select id from equipment where name = 'Dumbbell'),
  false,
  '0024'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

-- ---- SHOULDERS (6) ----

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Barbell Overhead Press',
  E'Unrack the barbell at collarbone height with a grip just outside shoulder width. Stand with feet hip-width apart, core braced, and glutes squeezed.\nPress the bar straight overhead by driving it off your shoulders and slightly back once it clears your forehead. Finish with the bar directly over your midfoot with arms locked out.\nLower the bar under control back to your collarbone, tucking your chin slightly to let the bar pass.',
  'shoulders',
  'deltoids',
  '["triceps", "abdominals"]'::jsonb,
  (select id from equipment where name = 'Barbell'),
  false,
  '0025'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Dumbbell Lateral Raise',
  E'Stand with a dumbbell in each hand at your sides, palms facing in, with a slight bend in your elbows.\nRaise both dumbbells out to the sides until your arms are parallel to the floor. Lead with your elbows and think about pouring water from a pitcher at the top.\nLower the dumbbells back to your sides slowly, resisting gravity the whole way down.',
  'shoulders',
  'deltoids',
  '["trapezius"]'::jsonb,
  (select id from equipment where name = 'Dumbbell'),
  false,
  '0026'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Dumbbell Front Raise',
  E'Stand with a dumbbell in each hand, arms resting in front of your thighs with palms facing your body.\nRaise one or both dumbbells straight out in front of you to shoulder height, keeping your arms nearly straight with just a slight elbow bend.\nLower the dumbbells back down with control. Avoid using momentum from your hips to swing the weight up.',
  'shoulders',
  'deltoids',
  '["chest"]'::jsonb,
  (select id from equipment where name = 'Dumbbell'),
  false,
  '0027'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Arnold Press',
  E'Sit on a bench with back support, holding a dumbbell in each hand at shoulder height with palms facing you, like the top of a curl.\nPress the dumbbells overhead while rotating your palms to face forward, so your arms finish in a standard overhead press position.\nReverse the motion on the way down, rotating your palms back toward you as you lower the dumbbells to the starting position.',
  'shoulders',
  'deltoids',
  '["triceps"]'::jsonb,
  (select id from equipment where name = 'Dumbbell'),
  false,
  '0028'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Dumbbell Rear Delt Fly',
  E'Bend forward at the hips until your torso is nearly parallel to the floor, holding a dumbbell in each hand with arms hanging straight down and palms facing each other.\nRaise the dumbbells out to the sides by squeezing your shoulder blades together, lifting until your arms are roughly parallel to the floor.\nLower the dumbbells back down with control, maintaining the bend in your torso throughout.',
  'shoulders',
  'deltoids',
  '["trapezius"]'::jsonb,
  (select id from equipment where name = 'Dumbbell'),
  false,
  '0029'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Machine Shoulder Press',
  E'Adjust the seat so the handles are at shoulder height. Sit with your back firmly against the pad and grip the handles with palms facing forward.\nPress the handles overhead until your arms are fully extended, keeping your back against the pad and your core tight.\nLower the handles under control back to shoulder height without letting the weight stack rest between reps.',
  'shoulders',
  'deltoids',
  '["triceps"]'::jsonb,
  (select id from equipment where name = 'Machine (Selectorized)'),
  false,
  '0030'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

-- ---- ARMS (8) ----

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Barbell Curl',
  E'Stand holding a barbell with an underhand shoulder-width grip, arms fully extended, and the bar resting against your thighs.\nCurl the bar up toward your shoulders by contracting your biceps, keeping your elbows pinned to your sides and your torso still.\nLower the bar back down under control to full extension. Do not swing or lean back to move the weight.',
  'upper arms',
  'biceps',
  '["forearms"]'::jsonb,
  (select id from equipment where name = 'Barbell'),
  false,
  '0031'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Dumbbell Hammer Curl',
  E'Stand with a dumbbell in each hand at your sides, palms facing your body in a neutral grip.\nCurl both dumbbells up simultaneously, keeping your palms facing each other throughout the entire movement. Squeeze your biceps and brachialis at the top.\nLower the dumbbells back down with control, maintaining the neutral grip.',
  'upper arms',
  'biceps',
  '["forearms"]'::jsonb,
  (select id from equipment where name = 'Dumbbell'),
  false,
  '0032'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'EZ Bar Preacher Curl',
  E'Sit at a preacher bench and rest the backs of your upper arms flat against the angled pad. Grip the EZ bar on the inner angled handles with an underhand grip.\nCurl the bar up toward your shoulders, squeezing your biceps at the top. Keep your upper arms pressed against the pad the entire time.\nLower the bar under control, extending your arms almost fully without locking out. The pad prevents cheating, so use a weight you can handle strictly.',
  'upper arms',
  'biceps',
  '["forearms"]'::jsonb,
  (select id from equipment where name = 'EZ Bar'),
  false,
  '0033'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Cable Tricep Pushdown',
  E'Attach a straight bar or V-bar to a high cable pulley. Stand facing the machine, grab the bar with an overhand grip, and tuck your elbows tight against your ribs.\nPush the bar straight down by extending your elbows until your arms are fully locked out. Squeeze your triceps at the bottom.\nLet the bar come back up under control, stopping when your forearms are slightly past 90 degrees. Keep your elbows stationary throughout.',
  'upper arms',
  'triceps',
  '[]'::jsonb,
  (select id from equipment where name = 'Cable Machine'),
  false,
  '0034'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Overhead Tricep Extension',
  E'Sit or stand holding a single dumbbell with both hands, arms fully extended overhead, gripping the inner plate with your palms.\nLower the dumbbell behind your head by bending your elbows, keeping your upper arms close to your ears. Go down until you feel a deep stretch in your triceps.\nExtend your arms to press the dumbbell back overhead, squeezing your triceps at the top.',
  'upper arms',
  'triceps',
  '[]'::jsonb,
  (select id from equipment where name = 'Dumbbell'),
  false,
  '0035'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Dips',
  E'Grip the parallel bars and hoist yourself up with arms locked out, shoulders down and away from your ears.\nLower your body by bending your elbows until your upper arms are at least parallel to the floor. Lean slightly forward to emphasize your chest, or stay upright for more tricep focus.\nPress yourself back up to full arm extension. Avoid swinging or kicking your legs.',
  'upper arms',
  'triceps',
  '["chest", "deltoids"]'::jsonb,
  (select id from equipment where name = 'Bodyweight'),
  false,
  '0036'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Close-Grip Bench Press',
  E'Lie on a flat bench and grip the barbell with hands about shoulder-width apart or slightly narrower. Unrack the bar and hold it above your chest.\nLower the bar to your lower chest, keeping your elbows tucked close to your body rather than flaring out.\nPress the bar back up to lockout, focusing on driving through your triceps. The narrower grip shifts the load from your chest to your triceps.',
  'upper arms',
  'triceps',
  '["chest", "deltoids"]'::jsonb,
  (select id from equipment where name = 'Barbell'),
  false,
  '0037'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Concentration Curl',
  E'Sit on a bench with your legs spread, holding a dumbbell in one hand. Brace the back of that arm against the inside of your thigh near your knee.\nCurl the dumbbell up toward your shoulder, squeezing your bicep hard at the top. Only your forearm should move.\nLower the dumbbell under control until your arm is fully extended. Complete all reps on one arm before switching.',
  'upper arms',
  'biceps',
  '["forearms"]'::jsonb,
  (select id from equipment where name = 'Dumbbell'),
  false,
  '0038'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

-- ---- CORE (5) ----

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Plank',
  E'Get into a forearm plank position with elbows directly under your shoulders, body in a straight line from head to heels, and your core braced as if expecting a punch.\nHold the position, breathing steadily. Do not let your hips sag toward the floor or pike up toward the ceiling.\nMaintain the hold for the target duration. If your form breaks, end the set rather than continuing with poor positioning.',
  'core',
  'abdominals',
  '["deltoids"]'::jsonb,
  (select id from equipment where name = 'Bodyweight'),
  false,
  '0039'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Hanging Leg Raise',
  E'Hang from a pull-up bar with an overhand grip, arms fully extended, and shoulders engaged (not passively hanging).\nRaise your legs together by flexing at the hips, bringing them up until they are at least parallel to the floor. For greater difficulty, raise them all the way to the bar.\nLower your legs under control. Avoid swinging and momentum — if you need to, pause at the bottom of each rep to kill the swing.',
  'core',
  'abdominals',
  '["hip flexors"]'::jsonb,
  (select id from equipment where name = 'Pull-up Bar'),
  false,
  '0040'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Cable Woodchop',
  E'Set a cable to the highest position with a single handle. Stand sideways to the machine, feet shoulder-width apart, and grab the handle with both hands.\nPull the handle diagonally across your body from high to low, rotating your torso and pivoting your back foot. Your arms stay relatively straight — the power comes from your core rotation.\nReturn to the starting position with control, resisting the cable''s pull. Complete all reps on one side before switching.',
  'core',
  'abdominals',
  '["deltoids"]'::jsonb,
  (select id from equipment where name = 'Cable Machine'),
  false,
  '0041'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Ab Wheel Rollout',
  E'Kneel on the floor holding an ab wheel with both hands, positioned directly under your shoulders.\nRoll the wheel forward by extending your arms and hips, lowering your torso toward the floor while keeping your core tight and back flat. Go as far as you can without your lower back arching.\nUse your abs to pull the wheel back to the starting position under your shoulders. Start with a shorter range of motion and build up.',
  'core',
  'abdominals',
  '["lats"]'::jsonb,
  (select id from equipment where name = 'Bodyweight'),
  false,
  '0042'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Russian Twist',
  E'Sit on the floor with your knees bent and feet slightly elevated. Lean back until your torso is at roughly 45 degrees, holding a weight plate, dumbbell, or medicine ball in front of your chest.\nRotate your torso to one side, bringing the weight beside your hip, then rotate to the opposite side. Each side-to-side rotation counts as one rep.\nKeep your core tight and your feet off the floor throughout. Move with control rather than speed.',
  'core',
  'abdominals',
  '[]'::jsonb,
  (select id from equipment where name = 'Bodyweight'),
  false,
  '0043'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

-- ---- COMPOUND / FULL BODY (7) ----

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Barbell Clean And Press',
  E'Stand over a barbell on the floor with your feet hip-width apart. Grip the bar just outside your knees, hips back, chest up.\nPull the bar explosively from the floor, shrug and catch it at your shoulders in a front rack position by dropping under it. From the front rack, press or push-press the bar overhead to full lockout.\nLower the bar back to your shoulders, then to the floor under control. This is a technical lift — start light and master the positions before adding load.',
  'full body',
  'deltoids',
  '["quadriceps", "trapezius", "glutes"]'::jsonb,
  (select id from equipment where name = 'Barbell'),
  false,
  '0044'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Kettlebell Swing',
  E'Stand with feet slightly wider than hip-width, holding a kettlebell with both hands at arm''s length. Hinge at your hips and swing the kettlebell back between your legs.\nDrive your hips forward explosively to swing the kettlebell up to chest or shoulder height. Your arms are just along for the ride — the power comes from your hips.\nLet the kettlebell fall back down naturally and hinge your hips back to absorb the momentum, flowing directly into the next rep.',
  'full body',
  'glutes',
  '["hamstrings", "abdominals", "deltoids"]'::jsonb,
  (select id from equipment where name = 'Kettlebell'),
  false,
  '0045'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Burpee',
  E'Stand with feet shoulder-width apart. Drop into a squat, place your hands on the floor, and jump or step your feet back into a push-up position.\nPerform a push-up, then jump or step your feet back to your hands and stand up explosively, jumping at the top with your arms overhead.\nLand softly and go straight into the next rep. Scale by stepping instead of jumping if needed.',
  'full body',
  'quadriceps',
  '["chest", "deltoids", "abdominals"]'::jsonb,
  (select id from equipment where name = 'Bodyweight'),
  false,
  '0046'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Farmer''s Walk',
  E'Pick up a heavy dumbbell or kettlebell in each hand and stand tall with your shoulders back and down, core braced, and arms at your sides.\nWalk forward with short, controlled steps, keeping your posture upright and the weights steady. Do not let the weights swing or your torso lean to one side.\nWalk for the prescribed distance or time, then set the weights down under control. Grip strength will often be the limiting factor.',
  'full body',
  'forearms',
  '["trapezius", "abdominals"]'::jsonb,
  (select id from equipment where name = 'Dumbbell'),
  false,
  '0047'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Barbell Hip Thrust',
  E'Sit on the floor with your upper back against a bench and a padded barbell across your hips. Plant your feet flat on the floor, about shoulder-width apart, with knees bent.\nDrive through your heels and squeeze your glutes to lift your hips until your body forms a straight line from shoulders to knees. Hold the top for a beat.\nLower your hips back down under control. Do not hyperextend your lower back at the top — the movement should come from your glutes.',
  'upper legs',
  'glutes',
  '["hamstrings", "abdominals"]'::jsonb,
  (select id from equipment where name = 'Barbell'),
  false,
  '0048'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Barbell Shrug',
  E'Stand holding a barbell at arm''s length in front of your thighs with an overhand grip, feet hip-width apart.\nShrug your shoulders straight up toward your ears as high as possible, squeezing your traps at the top. Do not roll your shoulders — just go straight up and down.\nLower the bar back to the starting position under control. Use straps if your grip gives out before your traps do.',
  'back',
  'trapezius',
  '["forearms"]'::jsonb,
  (select id from equipment where name = 'Barbell'),
  false,
  '0049'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;

insert into exercises (name, instructions, body_part, target_muscle, secondary_muscles, equipment_id, is_custom, external_id)
values (
  'Cable Pull-Through',
  E'Attach a rope handle to a low cable pulley. Stand facing away from the machine, straddling the cable, and grab the rope between your legs. Step forward until there is tension.\nHinge at your hips, pushing them back and letting the rope pull your hands between and behind your legs. Keep your knees slightly bent and your back flat.\nDrive your hips forward to stand up straight, squeezing your glutes at the top. Your arms stay straight throughout — this is a hip-hinge movement, not a pull.',
  'upper legs',
  'glutes',
  '["hamstrings"]'::jsonb,
  (select id from equipment where name = 'Cable Machine'),
  false,
  '0050'
)
on conflict (external_id) where is_custom = false and external_id is not null do nothing;
