-- TD KPI demo sample data
-- 5 modules, 5 assessments, 28 questions (+ choices)
-- FKs: conducting_department_id=18069 (Training and Development)
--      trainers 53/54/59 (HR), form_input_types 1=text 3=select_one 4=select_multiple
--
-- Optional cleanup (uncomment if reloading):
-- DELETE FROM td_kpi_assignment_questions;
-- DELETE FROM td_kpi_assignments;
-- DELETE FROM td_kpi_question_choices;
-- DELETE FROM td_kpi_questions;
-- DELETE FROM td_kpi_assessments;
-- DELETE FROM recurring_training_modules;

START TRANSACTION;

SET NAMES utf8mb4;

-- ===== Barista Grooming & Counter Standards =====
INSERT INTO recurring_training_modules
  (training_name, description, conducting_department_id, trainer_employee_id, targeted_department_id, created_at, updated_at)
VALUES (
  'Barista Grooming & Counter Standards',
  'Corrective refresh for baristas who fail the ባሬስታ ኢንስፔክተር ቼክሊስት: uniform, hygiene, counter discipline, and Kaldi''s guest-facing presence.',
  18069, 53, 120, NOW(), NOW()
);
SET @mod_barista = LAST_INSERT_ID();

INSERT INTO td_kpi_assessments
  (assessment_name, training_module_id, randomization_questions_number, status, created_at, updated_at)
VALUES (
  'Barista Post-Training Check',
  @mod_barista, 4, 'active', NOW(), NOW()
);
SET @asm_barista = LAST_INSERT_ID();

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Which barista uniform items must be clean, untorn, and properly fitted on shift?',
  @asm_barista, 4, 'white_tee,black_apron,black_pants,black_shoes', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'White T-shirt', 'white_tee', 0, NOW(), NOW()),
  (@qid, 'Black apron (tied correctly)', 'black_apron', 1, NOW(), NOW()),
  (@qid, 'Black pants', 'black_pants', 2, NOW(), NOW()),
  (@qid, 'Clean black leather shoes', 'black_shoes', 3, NOW(), NOW()),
  (@qid, 'Personal hoodie over uniform', 'hoodie', 4, NOW(), NOW());

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Are visible tattoos on hands or arms allowed while serving as a barista?',
  @asm_barista, 3, 'not_allowed', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'Allowed if small', 'allowed_small', 0, NOW(), NOW()),
  (@qid, 'Not allowed / must be covered per standard', 'not_allowed', 1, NOW(), NOW()),
  (@qid, 'Only on weekends', 'weekends', 2, NOW(), NOW());

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Personal items (phone, keys, bag) on the barista counter are:',
  @asm_barista, 3, 'not_allowed', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'Allowed during slow hours', 'slow_ok', 0, NOW(), NOW()),
  (@qid, 'Not allowed on the counter', 'not_allowed', 1, NOW(), NOW()),
  (@qid, 'Allowed if in a cup', 'in_cup', 2, NOW(), NOW());

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Hair on shift must be:',
  @asm_barista, 3, 'fully_tied', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'Fully gathered and tied back', 'fully_tied', 0, NOW(), NOW()),
  (@qid, 'Loose if short', 'loose_ok', 1, NOW(), NOW()),
  (@qid, 'Optional for men', 'optional_men', 2, NOW(), NOW());

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Name one Kaldi''s guest-facing expectation for barista counter cleanliness.',
  @asm_barista, 1, 'Keep the counter clear of personal items and wipe spills promptly', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Black apron on the barista station must be:',
  @asm_barista, 3, 'clean_tied', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'Clean and correctly tied', 'clean_tied', 0, NOW(), NOW()),
  (@qid, 'Optional after 8pm', 'optional_night', 1, NOW(), NOW()),
  (@qid, 'Borrowed from kitchen is fine', 'borrow_ok', 2, NOW(), NOW());

-- ===== Waiter Uniform & Floor Presence =====
INSERT INTO recurring_training_modules
  (training_name, description, conducting_department_id, trainer_employee_id, targeted_department_id, created_at, updated_at)
VALUES (
  'Waiter Uniform & Floor Presence',
  'Corrective module aligned to የዌይተር ኢንስፔክተር ቼክሊስት: dress code, non-slip footwear, grooming, and professional floor presence.',
  18069, 54, 60, NOW(), NOW()
);
SET @mod_waiter = LAST_INSERT_ID();

INSERT INTO td_kpi_assessments
  (assessment_name, training_module_id, randomization_questions_number, status, created_at, updated_at)
VALUES (
  'Waiter Post-Training Check',
  @mod_waiter, 4, 'active', NOW(), NOW()
);
SET @asm_waiter = LAST_INSERT_ID();

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Which items are required for waiter floor standards?',
  @asm_waiter, 4, 'white_tee_tucked,black_pants,non_slip_shoes', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'White T-shirt tucked in correctly', 'white_tee_tucked', 0, NOW(), NOW()),
  (@qid, 'Clean black pants (not torn/faded)', 'black_pants', 1, NOW(), NOW()),
  (@qid, 'Clean non-slip black shoes', 'non_slip_shoes', 2, NOW(), NOW()),
  (@qid, 'Open-toe sandals', 'sandals', 3, NOW(), NOW()),
  (@qid, 'Jeans of any color', 'jeans', 4, NOW(), NOW());

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Visible tattoos on hands/arms while serving guests are:',
  @asm_waiter, 3, 'not_allowed', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'Allowed', 'allowed', 0, NOW(), NOW()),
  (@qid, 'Not allowed per inspector standard', 'not_allowed', 1, NOW(), NOW()),
  (@qid, 'Manager discretion only', 'manager', 2, NOW(), NOW());

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Waiter belt/shirt appearance should be:',
  @asm_waiter, 3, 'clean_pressed', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'Clean, pressed, and properly worn', 'clean_pressed', 0, NOW(), NOW()),
  (@qid, 'Wrinkled is acceptable if busy', 'wrinkled_ok', 1, NOW(), NOW()),
  (@qid, 'Any color belt is fine', 'any_belt', 2, NOW(), NOW());

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Non-slip footwear is required because:',
  @asm_waiter, 3, 'safety_standard', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'It is a safety and branch standard', 'safety_standard', 0, NOW(), NOW()),
  (@qid, 'Only for rainy season', 'rain_only', 1, NOW(), NOW()),
  (@qid, 'Only for managers', 'managers', 2, NOW(), NOW());

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Briefly state why tucked-in uniform matters for waiter guest experience.',
  @asm_waiter, 1, 'It shows professionalism and meets Kaldi''s inspector dress standard', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Shift grooming for waiters includes:',
  @asm_waiter, 3, 'neat_professional', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'Neat, professional appearance matching checklist', 'neat_professional', 0, NOW(), NOW()),
  (@qid, 'Heavy fragrance to cover kitchen smells', 'heavy_scent', 1, NOW(), NOW()),
  (@qid, 'Casual sportswear after rush', 'sportswear', 2, NOW(), NOW());

-- ===== Cashier Presentation & Hygiene =====
INSERT INTO recurring_training_modules
  (training_name, description, conducting_department_id, trainer_employee_id, targeted_department_id, created_at, updated_at)
VALUES (
  'Cashier Presentation & Hygiene',
  'Corrective module for ካሸር checklist gaps: uniform tuck-in, nail/perfume standards, and guest-facing cashier presentation.',
  18069, 59, 95, NOW(), NOW()
);
SET @mod_cashier = LAST_INSERT_ID();

INSERT INTO td_kpi_assessments
  (assessment_name, training_module_id, randomization_questions_number, status, created_at, updated_at)
VALUES (
  'Cashier Post-Training Check',
  @mod_cashier, 3, 'active', NOW(), NOW()
);
SET @asm_cashier = LAST_INSERT_ID();

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Cashier nail standard requires:',
  @asm_cashier, 3, 'short_clean_no_art', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'Short, clean nails — no polish or artificial nails', 'short_clean_no_art', 0, NOW(), NOW()),
  (@qid, 'Long gel nails are fine if clear', 'gel_ok', 1, NOW(), NOW()),
  (@qid, 'Any style on weekends', 'weekend_any', 2, NOW(), NOW());

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Strong perfume/cologne on the cashier station is:',
  @asm_cashier, 3, 'not_allowed', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'Encouraged for brand scent', 'encouraged', 0, NOW(), NOW()),
  (@qid, 'Not allowed', 'not_allowed', 1, NOW(), NOW()),
  (@qid, 'Allowed if guests like it', 'guest_ok', 2, NOW(), NOW());

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Which cashier presentation items must pass inspection?',
  @asm_cashier, 4, 'white_tee_tucked,black_pants,clean_shoes', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'White T-shirt clean and tucked in', 'white_tee_tucked', 0, NOW(), NOW()),
  (@qid, 'Black pants clean and untorn', 'black_pants', 1, NOW(), NOW()),
  (@qid, 'Clean black flat non-slip leather shoes', 'clean_shoes', 2, NOW(), NOW()),
  (@qid, 'Bright nail art', 'nail_art', 3, NOW(), NOW());

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Why must the cashier T-shirt be tucked in?',
  @asm_cashier, 1, 'It meets Kaldi''s uniform standard and looks professional to guests', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Artificial nails on cashiers are:',
  @asm_cashier, 3, 'not_allowed', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'Not allowed', 'not_allowed', 0, NOW(), NOW()),
  (@qid, 'Allowed under gloves', 'gloves', 1, NOW(), NOW()),
  (@qid, 'Allowed for supervisors', 'supervisors', 2, NOW(), NOW());

-- ===== Display Merchandising & Product Safety =====
INSERT INTO recurring_training_modules
  (training_name, description, conducting_department_id, trainer_employee_id, targeted_department_id, created_at, updated_at)
VALUES (
  'Display Merchandising & Product Safety',
  'Corrective module for ዲስፕሌይ checklist gaps: hair net / product-safety rules, personal items on display, and merchandising presentation.',
  18069, 53, 142, NOW(), NOW()
);
SET @mod_display = LAST_INSERT_ID();

INSERT INTO td_kpi_assessments
  (assessment_name, training_module_id, randomization_questions_number, status, created_at, updated_at)
VALUES (
  'Display Post-Training Check',
  @mod_display, 3, 'active', NOW(), NOW()
);
SET @asm_display = LAST_INSERT_ID();

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Hair net on display duty must:',
  @asm_display, 3, 'cover_all_hair', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'Cover all hair correctly (product-safety rule)', 'cover_all_hair', 0, NOW(), NOW()),
  (@qid, 'Be optional if hair is short', 'optional_short', 1, NOW(), NOW()),
  (@qid, 'Only be worn in the kitchen', 'kitchen_only', 2, NOW(), NOW());

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Personal items on the display area are:',
  @asm_display, 3, 'not_allowed', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'Not allowed (phone, keys, bag)', 'not_allowed', 0, NOW(), NOW()),
  (@qid, 'Allowed behind the pastry case', 'behind_case', 1, NOW(), NOW()),
  (@qid, 'Allowed during setup', 'setup_ok', 2, NOW(), NOW());

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Select display uniform requirements that match the inspector checklist.',
  @asm_display, 4, 'white_tee,black_pants,black_shoes,hair_tied', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'Clean white T-shirt tucked into pants', 'white_tee', 0, NOW(), NOW()),
  (@qid, 'Clean black pants/skirt properly fitted', 'black_pants', 1, NOW(), NOW()),
  (@qid, 'Clean black leather non-slip shoes', 'black_shoes', 2, NOW(), NOW()),
  (@qid, 'Hair fully covered / tied as required', 'hair_tied', 3, NOW(), NOW()),
  (@qid, 'Visible arm tattoos uncovered', 'tattoos_ok', 4, NOW(), NOW());

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Name the main food-safety reason for a hair net on display.',
  @asm_display, 1, 'Prevent hair from contaminating displayed food products', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Visible tattoos on display staff hands/arms are:',
  @asm_display, 3, 'not_allowed', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'Not allowed per checklist', 'not_allowed', 0, NOW(), NOW()),
  (@qid, 'Allowed if artistic', 'artistic', 1, NOW(), NOW()),
  (@qid, 'Required for brand', 'required', 2, NOW(), NOW());

-- ===== Janitor Uniform & Cleanliness Protocol =====
INSERT INTO recurring_training_modules
  (training_name, description, conducting_department_id, trainer_employee_id, targeted_department_id, created_at, updated_at)
VALUES (
  'Janitor Uniform & Cleanliness Protocol',
  'Corrective module for ጃኒተር checklist gaps: apron, hair cover, personal-item discipline, and shift cleanliness expectations.',
  18069, 54, 87, NOW(), NOW()
);
SET @mod_janitor = LAST_INSERT_ID();

INSERT INTO td_kpi_assessments
  (assessment_name, training_module_id, randomization_questions_number, status, created_at, updated_at)
VALUES (
  'Janitor Post-Training Check',
  @mod_janitor, 3, 'active', NOW(), NOW()
);
SET @asm_janitor = LAST_INSERT_ID();

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Janitor apron standard requires the apron to be:',
  @asm_janitor, 3, 'white_clean_tied', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'White, clean, untorn, and correctly tied', 'white_clean_tied', 0, NOW(), NOW()),
  (@qid, 'Any color if clean', 'any_color', 1, NOW(), NOW()),
  (@qid, 'Optional on night shift', 'optional_night', 2, NOW(), NOW());

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Hair cover (cap) for janitors must:',
  @asm_janitor, 3, 'cover_all_untorn', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'Be untorn and cover all hair correctly', 'cover_all_untorn', 0, NOW(), NOW()),
  (@qid, 'Be worn only in guest restrooms', 'restrooms_only', 1, NOW(), NOW()),
  (@qid, 'Be optional if hair is braided', 'braid_optional', 2, NOW(), NOW());

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Which janitor shift rules match the ጃኒተር checklist?',
  @asm_janitor, 4, 'no_personal_items,hair_tied,clean_shoes', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'No visible personal items (phone, keys) while working', 'no_personal_items', 0, NOW(), NOW()),
  (@qid, 'Hair fully gathered and tied', 'hair_tied', 1, NOW(), NOW()),
  (@qid, 'Clean black non-slip shoes', 'clean_shoes', 2, NOW(), NOW()),
  (@qid, 'Heavy makeup is preferred', 'heavy_makeup', 3, NOW(), NOW());

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Makeup for janitors on shift should be:',
  @asm_janitor, 3, 'light_professional', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'Light and professional (not excessive)', 'light_professional', 0, NOW(), NOW()),
  (@qid, 'Bold stage makeup', 'bold', 1, NOW(), NOW()),
  (@qid, 'Not reviewed by inspectors', 'not_reviewed', 2, NOW(), NOW());

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'State one reason personal phones should stay off the floor during cleaning.',
  @asm_janitor, 1, 'Keeps focus on sanitation standards and meets inspector checklist', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_questions
  (label, assessment_id, form_input_type_id, answer, status, created_at, updated_at)
VALUES (
  'Clean black non-slip shoes for janitors are:',
  @asm_janitor, 3, 'required', 'active', NOW(), NOW()
);
SET @qid = LAST_INSERT_ID();

INSERT INTO td_kpi_question_choices (td_kpi_question_id, label, value, order_index, created_at, updated_at) VALUES
  (@qid, 'Required', 'required', 0, NOW(), NOW()),
  (@qid, 'Optional indoors', 'optional', 1, NOW(), NOW()),
  (@qid, 'Only for supervisors', 'supervisors', 2, NOW(), NOW());

COMMIT;
