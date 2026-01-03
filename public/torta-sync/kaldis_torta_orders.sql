-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: mysql-db02.remote:32636
-- Generation Time: Jan 02, 2026 at 10:11 PM
-- Server version: 8.4.0
-- PHP Version: 8.4.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `kaldis_torta_orders`
--

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

CREATE TABLE `branches` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `telegram_group_id` bigint DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `branches`
--

INSERT INTO `branches` (`id`, `name`, `branch_code`, `address`, `phone`, `created_at`, `updated_at`, `telegram_group_id`) VALUES
(1, 'Adama German', '43506', 'Adama', '', '2025-12-15 19:47:11', '2026-01-02 08:42:56', 814523272),
(2, 'Bishoftu', '43512', 'Bishoftu', '', '2025-12-15 19:47:11', '2025-12-30 13:52:32', NULL),
(3, 'Betel Bicha Foq', '43490', 'Betel Bicha Foq', '', '2025-12-15 19:47:11', '2025-12-30 13:52:02', -1001112223334),
(4, 'Addisu Gebya', '43491', 'Addisu Gebya', '', '2025-12-15 19:47:11', '2025-12-30 13:51:14', NULL),
(5, 'Betel  Adebabay', '43518', 'Betel  Adebabay', '', '2025-12-15 19:47:11', '2025-12-30 13:51:37', NULL),
(8, 'Bole Medhanialem', '43508', 'Bole Medhanialem', '', '2025-12-30 13:52:55', '2025-12-30 13:52:55', NULL),
(9, 'Bulbula  Medhanialm', '43523', 'Bulbula  Medhanialm', '', '2025-12-30 13:53:25', '2025-12-30 13:53:25', NULL),
(10, 'Bulbula 93', '43513', 'Bulbula 93', '', '2025-12-30 13:53:42', '2025-12-30 13:53:42', NULL),
(11, 'Gulele Medhanialm', '43487', 'Gulele Medhanialm', '', '2025-12-30 13:54:22', '2025-12-30 13:54:22', NULL),
(12, 'Gurdshola', '43514', 'Gurdshola', '', '2025-12-31 05:57:13', '2025-12-31 05:57:13', NULL),
(13, 'Imperial', '43497', 'Imperial', '', '2025-12-31 05:57:37', '2025-12-31 05:57:37', NULL),
(14, 'Jemo', '43515', 'Jemo', '', '2025-12-31 05:57:58', '2025-12-31 05:57:58', NULL),
(15, 'Kality Sheger', '43486', 'Kality Sheger', '', '2025-12-31 05:58:21', '2025-12-31 05:58:21', NULL),
(16, 'Kera', '43482', 'Kera', '', '2025-12-31 05:58:40', '2025-12-31 05:58:40', NULL),
(17, 'Lancha', '43489', 'Lancha', '', '2025-12-31 05:58:57', '2025-12-31 05:58:57', NULL),
(18, 'Lebu', '43510', 'Lebu', '', '2025-12-31 05:59:14', '2025-12-31 05:59:14', NULL),
(19, 'Megenaga', '43488', 'Megenaga', '', '2025-12-31 05:59:44', '2025-12-31 05:59:44', NULL),
(20, 'Mexico', '51202', 'Mexico', '', '2025-12-31 06:00:01', '2025-12-31 06:00:01', NULL),
(21, 'Old Airport', '43524', 'Old Airport', '', '2025-12-31 06:00:19', '2025-12-31 06:00:19', NULL),
(22, 'Sarbet', '43485', 'Sarbet', '', '2025-12-31 06:00:33', '2025-12-31 06:01:14', NULL),
(23, 'Semen Hotel', '43484', 'Semen Hotel', '', '2025-12-31 06:01:35', '2025-12-31 06:01:35', NULL),
(24, 'Semit Figa', '43500', 'Semit Figa', '', '2025-12-31 06:01:50', '2025-12-31 06:01:50', NULL),
(25, 'Torhailoch', '43505', 'Torhailoch', '', '2025-12-31 06:02:07', '2025-12-31 06:02:07', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` int NOT NULL,
  `chat_id` bigint NOT NULL,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `language` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT 'en',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `chat_id`, `username`, `first_name`, `last_name`, `language`, `phone`, `created_at`, `updated_at`) VALUES
(1, 814523272, 'BereZkirkos', 'ⒷⒺⓇⒺ 🤨', '', 'en', '0984724911', '2025-12-15 20:20:50', '2026-01-02 08:31:03'),
(3, -1003376582905, 'bere_kaldis', 'Berhanu', 'Seyoum', NULL, NULL, '2025-12-16 00:57:20', '2025-12-17 11:16:18'),
(5, 1283498943, 'osmanitah', 'Osman', '', 'am', '0938036233', '2025-12-16 08:33:14', '2026-01-02 06:04:11'),
(6, 1137601047, 'Abaismyhero16', 'Mahalet', 'Taye', NULL, NULL, '2025-12-16 10:21:17', '2025-12-17 11:16:18'),
(7, 839799843, 'Tuti Ayele', 'Tuti', 'Ayele', 'am', NULL, '2025-12-16 10:21:33', '2026-01-01 07:25:21'),
(8, 1301023557, 'Happymeeeeeeeeeeee', '.', '', NULL, NULL, '2025-12-16 11:08:20', '2025-12-17 11:16:18'),
(9, 254962662, 'Zedoyimer', 'zedo', '', NULL, NULL, '2025-12-16 14:41:52', '2025-12-17 11:16:18'),
(10, 474781787, 'Beyemar', 'ቤዬ', '', NULL, NULL, '2025-12-17 06:37:43', '2025-12-17 11:16:18'),
(11, 350639323, 'Selam Megersa', 'Selam', 'Megersa', NULL, NULL, '2025-12-17 10:28:44', '2025-12-17 11:16:18'),
(12, 1626288394, 'bere_kaldis', 'Berhanu', 'Seyoum', 'en', '0984724911', '2025-12-17 10:59:31', '2026-01-02 19:00:11'),
(24, 475405880, 'Jo_Dem', 'Jxhn', '', 'en', NULL, '2025-12-26 05:04:50', '2025-12-26 05:04:50'),
(26, 6016238187, 'Demelash Mamo', 'Demelash', 'Mamo', 'en', NULL, '2025-12-30 05:42:03', '2025-12-30 05:42:03'),
(55, 387279197, 'Ermiyas_N', 'Ermiyas', 'Neway', 'en', '0946349322', '2025-12-30 06:45:53', '2026-01-02 06:42:50'),
(97, 5936446622, 'Kassahun Zewdu', 'Kassahun', 'Zewdu', 'am', NULL, '2025-12-30 15:13:48', '2025-12-30 15:13:53'),
(103, 6492922880, 'kaldiscoffeee', 'KALDI\'S', '', 'am', '0938101010', '2025-12-31 09:15:45', '2026-01-01 16:02:27'),
(110, 566752659, 'Museum_freak', 'Rozi', '', 'am', NULL, '2026-01-01 07:07:50', '2026-01-01 07:07:55'),
(117, 1357851275, 'Ab_teme', 'Abreham', '', 'en', NULL, '2026-01-01 08:29:14', '2026-01-01 08:29:14'),
(151, 364421185, 'Bubu_1', 'Black', '', 'am', '0921606830', '2026-01-02 07:29:35', '2026-01-02 07:30:00'),
(152, 1764651022, 'Mihret_Shita', 'mhret', 'shitahun', 'am', '0930419030', '2026-01-02 07:42:21', '2026-01-02 07:43:08'),
(172, 5656714139, 'mikias25', 'Mikias', '', 'am', '0941025139', '2026-01-02 14:08:24', '2026-01-02 14:08:38');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('info','success','warning','danger') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `target_customer_id` int DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `delivered_at` datetime DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `title`, `message`, `type`, `target_customer_id`, `is_read`, `delivered_at`, `read_at`, `scheduled_at`, `sent_at`, `created_at`, `updated_at`) VALUES
(1, 'New Order ORD-695816645ED59', 'A new order has been placed by bere_kaldis for 11876 ETB', 'info', NULL, 0, NULL, NULL, NULL, NULL, '2026-01-02 19:03:02', '2026-01-02 19:03:02');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int NOT NULL,
  `order_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `payment_method` enum('CBE','Telebirr') COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_slip` text COLLATE utf8mb4_unicode_ci,
  `pickup_date` date NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hear_about` enum('tiktok','telegram','facebook','instagram') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','confirmed','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `chat_id` bigint NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `order_number`, `customer_id`, `branch_id`, `total_amount`, `payment_method`, `payment_slip`, `pickup_date`, `phone`, `hear_about`, `notes`, `status`, `username`, `chat_id`, `created_at`, `updated_at`) VALUES
(1, NULL, 12, 1, 4000.00, 'CBE', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_68.jpg', '2025-01-07', '0930332185', 'tiktok', '', 'pending', 'bere_kaldis', 1626288394, '2026-01-02 16:54:02', '2026-01-02 16:54:02'),
(2, NULL, 12, 1, 4000.00, 'CBE', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_68.jpg', '2025-01-07', '0930332185', 'tiktok', '', 'pending', 'bere_kaldis', 1626288394, '2026-01-02 16:54:28', '2026-01-02 16:54:28'),
(3, NULL, 12, 20, 2064.00, 'Telebirr', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_69.jpg', '2025-01-07', '0910007694', 'telegram', '', 'pending', 'bere_kaldis', 1626288394, '2026-01-02 18:19:47', '2026-01-02 18:19:47'),
(4, NULL, 12, 20, 2064.00, 'Telebirr', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_69.jpg', '2025-01-07', '0910007694', 'telegram', '', 'pending', 'bere_kaldis', 1626288394, '2026-01-02 18:20:18', '2026-01-02 18:20:18'),
(5, 'ORD-69581105883D1', 12, 1, 5250.00, 'CBE', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/documents/file_70.pdf', '2025-01-07', '0910007694', 'instagram', '', 'pending', 'bere_kaldis', 1626288394, '2026-01-02 18:40:05', '2026-01-02 18:40:05'),
(6, 'ORD-69581123DBADA', 12, 1, 5250.00, 'CBE', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/documents/file_70.pdf', '2025-01-07', '0910007694', 'instagram', '', 'pending', 'bere_kaldis', 1626288394, '2026-01-02 18:40:35', '2026-01-02 18:40:35'),
(7, 'ORD-695816645ED59', 12, 1, 11876.00, 'CBE', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/', '2025-01-07', '0984724911', 'tiktok', 'ORD-1626288394-1767380580', 'confirmed', 'bere_kaldis', 1626288394, '2026-01-02 19:03:00', '2026-01-02 19:09:04');

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` int NOT NULL,
  `order_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `quantity`, `price`, `created_at`, `updated_at`) VALUES
(1, 1, 2, 2, 2000.00, '2026-01-02 16:54:02', '2026-01-02 16:54:02'),
(2, 2, 2, 2, 2000.00, '2026-01-02 16:54:28', '2026-01-02 16:54:28'),
(3, 3, 5, 3, 688.00, '2026-01-02 18:19:47', '2026-01-02 18:19:47'),
(4, 4, 5, 3, 688.00, '2026-01-02 18:20:18', '2026-01-02 18:20:18'),
(5, 5, 1, 3, 1750.00, '2026-01-02 18:40:05', '2026-01-02 18:40:05'),
(6, 6, 1, 3, 1750.00, '2026-01-02 18:40:35', '2026-01-02 18:40:35'),
(7, 7, 3, 6, 1750.00, '2026-01-02 19:03:00', '2026-01-02 19:03:00'),
(8, 7, 5, 2, 688.00, '2026-01-02 19:03:00', '2026-01-02 19:03:00');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `local_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `price` decimal(10,2) NOT NULL,
  `image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `available` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `name`, `local_code`, `description`, `price`, `image`, `available`, `created_at`, `updated_at`) VALUES
(1, 'Black Forest Torta', '2026', 'Before Discount 2250 Birr', 1750.00, NULL, 1, '2025-12-15 19:47:11', '2025-12-31 06:10:55'),
(2, 'Chocolate Torta', '4155', 'Before Discount 2500', 2000.00, NULL, 1, '2025-12-15 19:47:11', '2025-12-31 06:08:48'),
(3, 'Bush De Noel Torta', '2035', 'Before Discount  2250 Birr', 1750.00, NULL, 1, '2025-12-15 19:47:11', '2025-12-31 06:13:15'),
(4, 'Assorted Package Full', '6022', '', 1350.00, NULL, 1, '2025-12-15 19:47:11', '2025-12-31 06:16:22'),
(5, 'Assorted Package half', '6023', '', 688.00, NULL, 1, '2025-12-15 19:47:11', '2025-12-31 06:15:37');

-- --------------------------------------------------------

--
-- Table structure for table `user_states`
--

CREATE TABLE `user_states` (
  `id` int NOT NULL,
  `chat_id` bigint NOT NULL,
  `state` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` text COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_states`
--

INSERT INTO `user_states` (`id`, `chat_id`, `state`, `data`, `updated_at`) VALUES
(970, 1626288394, 'awaiting_final_confirmation', '{\"placing_order\":true}', '2026-01-02 19:04:23');

-- --------------------------------------------------------

--
-- Table structure for table `user_steps`
--

CREATE TABLE `user_steps` (
  `id` int NOT NULL,
  `chat_id` bigint NOT NULL,
  `step` varchar(100) NOT NULL,
  `details` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `user_steps`
--

INSERT INTO `user_steps` (`id`, `chat_id`, `step`, `details`, `created_at`) VALUES
(1, 1626288394, 'start', 'User started the bot', '2026-01-02 18:15:19'),
(2, 1626288394, 'start', 'User started the bot', '2026-01-02 18:15:20'),
(3, 1626288394, 'start', 'User started the bot', '2026-01-02 18:17:59'),
(4, 1626288394, 'language_selected', 'User selected language: en', '2026-01-02 18:18:04'),
(5, 1626288394, 'phone_provided', 'User provided phone number: 0910007694', '2026-01-02 18:18:12'),
(6, 1626288394, 'continue_bot', 'User chose to start a new order', '2026-01-02 18:18:15'),
(7, 1626288394, 'checkout', 'User proceeded to checkout', '2026-01-02 18:18:22'),
(8, 1626288394, 'payment_slip_uploaded', 'User uploaded payment slip', '2026-01-02 18:18:57'),
(9, 1626288394, 'hear_about_selected', 'User selected: telegram', '2026-01-02 18:19:42'),
(10, 1626288394, 'order_placed', 'User placed an order', '2026-01-02 18:19:47'),
(11, 1626288394, 'order_placed', 'User placed an order', '2026-01-02 18:20:18'),
(12, 1626288394, 'start', 'User started the bot', '2026-01-02 18:37:14'),
(13, 1626288394, 'language_selected', 'User selected language: en', '2026-01-02 18:37:17'),
(14, 1626288394, 'phone_provided', 'User provided phone number: 0910007694', '2026-01-02 18:37:25'),
(15, 1626288394, 'continue_bot', 'User chose to start a new order', '2026-01-02 18:37:28'),
(16, 1626288394, 'checkout', 'User proceeded to checkout', '2026-01-02 18:37:35'),
(17, 1626288394, 'payment_slip_uploaded', 'User uploaded payment slip', '2026-01-02 18:38:08'),
(18, 1626288394, 'hear_about_selected', 'User selected: instagram', '2026-01-02 18:38:12'),
(19, 1626288394, 'order_placed', 'User placed an order', '2026-01-02 18:40:04'),
(20, 1626288394, 'order_placed', 'User placed an order', '2026-01-02 18:40:35'),
(21, 1626288394, 'start', 'User started the bot', '2026-01-02 19:00:03'),
(22, 1626288394, 'language_selected', 'User selected language: en', '2026-01-02 19:00:06'),
(23, 1626288394, 'phone_provided', 'User provided phone number: 0984724911', '2026-01-02 19:00:11'),
(24, 1626288394, 'continue_bot', 'User chose to start a new order', '2026-01-02 19:00:14'),
(25, 1626288394, 'checkout', 'User proceeded to checkout', '2026-01-02 19:00:40'),
(26, 1626288394, 'payment_slip_uploaded', 'User uploaded payment slip', '2026-01-02 19:01:44'),
(27, 1626288394, 'hear_about_selected', 'User selected: tiktok', '2026-01-02 19:01:51'),
(28, 1626288394, 'order_placed', 'User placed an order', '2026-01-02 19:03:00'),
(29, 1626288394, 'history_from_success', 'User chose to view order history from success screen', '2026-01-02 19:03:37');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `branches`
--
ALTER TABLE `branches`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `chat_id` (`chat_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_number` (`order_number`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `status` (`status`),
  ADD KEY `created_at` (`created_at`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `user_states`
--
ALTER TABLE `user_states`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `chat_id` (`chat_id`);

--
-- Indexes for table `user_steps`
--
ALTER TABLE `user_steps`
  ADD PRIMARY KEY (`id`),
  ADD KEY `chat_id` (`chat_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `branches`
--
ALTER TABLE `branches`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=180;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `user_states`
--
ALTER TABLE `user_states`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=971;

--
-- AUTO_INCREMENT for table `user_steps`
--
ALTER TABLE `user_steps`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
