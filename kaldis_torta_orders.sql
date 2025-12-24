-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: mysql-db02.remote:32636
-- Generation Time: Dec 24, 2025 at 09:57 AM
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
  `address` text COLLATE utf8mb4_unicode_ci,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `telegram_group_id` bigint DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `branches`
--

INSERT INTO `branches` (`id`, `name`, `address`, `phone`, `created_at`, `updated_at`, `telegram_group_id`) VALUES
(1, 'Bole', 'Bole Road, Addis Ababa', '+251911000001', '2025-12-15 19:47:11', '2025-12-20 08:06:38', -1001234567890),
(2, 'Piassa', 'Piassa, Addis Ababa', '+251911000002', '2025-12-15 19:47:11', '2025-12-15 19:47:11', NULL),
(3, 'Megenagna', 'Megenagna, Addis Ababa', '+251911000003', '2025-12-15 19:47:11', '2025-12-20 08:06:38', -1001112223334),
(4, 'CMC', 'CMC, Addis Ababa', '+251911000004', '2025-12-15 19:47:11', '2025-12-15 19:47:11', NULL),
(5, 'Jemo', 'Jemo, Addis Ababa', '+251911000005', '2025-12-15 19:47:11', '2025-12-15 19:47:11', NULL);

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
(1, 814523272, 'BereZkirkos', 'ⒷⒺⓇⒺ 🤨', '', 'am', NULL, '2025-12-15 20:20:50', '2025-12-17 11:16:48'),
(3, -1003376582905, 'bere_kaldis', 'Berhanu', 'Seyoum', NULL, NULL, '2025-12-16 00:57:20', '2025-12-17 11:16:18'),
(5, 1283498943, 'osmanitah', 'Osman', '', NULL, NULL, '2025-12-16 08:33:14', '2025-12-17 11:16:18'),
(6, 1137601047, 'Abaismyhero16', 'Mahalet', 'Taye', NULL, NULL, '2025-12-16 10:21:17', '2025-12-17 11:16:18'),
(7, 839799843, 'Tuti Ayele', 'Tuti', 'Ayele', NULL, NULL, '2025-12-16 10:21:33', '2025-12-17 11:16:18'),
(8, 1301023557, 'Happymeeeeeeeeeeee', '.', '', NULL, NULL, '2025-12-16 11:08:20', '2025-12-17 11:16:18'),
(9, 254962662, 'Zedoyimer', 'zedo', '', NULL, NULL, '2025-12-16 14:41:52', '2025-12-17 11:16:18'),
(10, 474781787, 'Beyemar', 'ቤዬ', '', NULL, NULL, '2025-12-17 06:37:43', '2025-12-17 11:16:18'),
(11, 350639323, 'Selam Megersa', 'Selam', 'Megersa', NULL, NULL, '2025-12-17 10:28:44', '2025-12-17 11:16:18'),
(12, 1626288394, 'bere_kaldis', 'Berhanu', 'Seyoum', 'am', NULL, '2025-12-17 10:59:31', '2025-12-20 06:14:24'),
(14, 6492922880, 'kaldiscoffeee', 'KALDI\'S', '', 'am', NULL, '2025-12-17 11:39:13', '2025-12-17 11:39:19');

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
(28, 'Missed Our Tortas? 🍰', 'Hey there!\n\nIt\'s been a while since your last order. Craving something delicious?\n\nUse /start to order your favorites again!\n\nSpecial treat awaits you 😉', 'info', 1, 0, NULL, NULL, NULL, NULL, '2025-12-16 16:36:23', '2025-12-16 16:36:23'),
(29, 'New Order #11', 'A new order has been placed by @BereZkirkos for 420 ETB', 'info', NULL, 0, NULL, NULL, NULL, NULL, '2025-12-16 17:01:51', '2025-12-16 17:01:51'),
(30, 'New Order #12', 'A new order has been placed by @BereZkirkos for 360 ETB', 'info', NULL, 0, NULL, NULL, NULL, NULL, '2025-12-17 06:33:04', '2025-12-17 06:33:04'),
(31, 'New Order #13', 'A new order has been placed by @Beyemar for 540 ETB', 'info', NULL, 0, NULL, NULL, NULL, NULL, '2025-12-17 06:39:25', '2025-12-17 06:39:25'),
(32, 'New Order #14', 'A new order has been placed by @BereZkirkos for 360 ETB', 'info', NULL, 0, NULL, NULL, NULL, NULL, '2025-12-17 11:08:52', '2025-12-17 11:08:52'),
(33, 'New Order #15', 'A new order has been placed by @kaldiscoffeee for 360 ETB', 'info', NULL, 0, NULL, NULL, NULL, NULL, '2025-12-17 11:42:13', '2025-12-17 11:42:13');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int NOT NULL,
  `customer_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `payment_method` enum('CBE','Telebirr') COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_slip` text COLLATE utf8mb4_unicode_ci,
  `pickup_date` date NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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

INSERT INTO `orders` (`id`, `customer_id`, `branch_id`, `total_amount`, `payment_method`, `payment_slip`, `pickup_date`, `phone`, `notes`, `status`, `username`, `chat_id`, `created_at`, `updated_at`) VALUES
(1, 1, 4, 160.00, 'Telebirr', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_27.jpg', '2025-12-20', '0984724911', '', 'cancelled', 'BereZkirkos', 814523272, '2025-12-15 20:21:48', '2025-12-15 22:19:44'),
(2, 1, 5, 280.00, 'CBE', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_27.jpg', '2025-12-22', '0984724911', '', 'cancelled', 'BereZkirkos', 814523272, '2025-12-16 00:31:19', '2025-12-16 07:10:30'),
(3, 1, 4, 320.00, 'CBE', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_29.jpg', '2025-12-21', '0984724911', '', 'completed', 'BereZkirkos', 814523272, '2025-12-16 00:51:17', '2025-12-16 07:11:04'),
(4, 1, 3, 700.00, 'CBE', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_31.jpg', '2025-12-19', '0984724911', '', 'completed', 'BereZkirkos', 814523272, '2025-12-16 07:14:22', '2025-12-16 15:03:08'),
(5, 5, 5, 930.00, 'Telebirr', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_32.jpg', '2025-12-22', '0909090909', '', 'completed', 'osmanitah', 1283498943, '2025-12-16 08:42:05', '2025-12-16 08:48:58'),
(6, 6, 3, 720.00, 'Telebirr', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_33.jpg', '2025-12-19', '0911380529', '', 'confirmed', 'Abaismyhero16', 1137601047, '2025-12-16 10:24:14', '2025-12-16 11:26:29'),
(7, 7, 1, 150.00, 'Telebirr', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_34.jpg', '2025-12-17', '0911177440', '', 'confirmed', 'Tuti Ayele', 839799843, '2025-12-16 10:25:26', '2025-12-16 11:26:26'),
(8, 1, 2, 320.00, 'CBE', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_35.jpg', '2025-12-20', '0984724911', '', 'completed', 'BereZkirkos', 814523272, '2025-12-16 16:15:46', '2025-12-16 16:45:01'),
(9, 1, 4, 640.00, 'CBE', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_36.jpg', '2025-12-16', '0930332185', '', 'cancelled', 'BereZkirkos', 814523272, '2025-12-16 16:18:52', '2025-12-16 16:43:30'),
(10, 1, 4, 540.00, 'Telebirr', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_37.jpg', '2025-12-20', '0984724911', '', 'cancelled', 'BereZkirkos', 814523272, '2025-12-16 16:28:39', '2025-12-16 16:30:43'),
(11, 1, 3, 420.00, 'CBE', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_38.jpg', '2025-12-19', '0984724911', '', 'pending', 'BereZkirkos', 814523272, '2025-12-16 17:01:50', '2025-12-16 17:01:50'),
(12, 1, 4, 360.00, 'Telebirr', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_39.jpg', '2025-12-20', '0984724911', '', 'pending', 'BereZkirkos', 814523272, '2025-12-17 06:33:03', '2025-12-17 06:33:03'),
(13, 10, 3, 540.00, 'Telebirr', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_40.jpg', '2025-12-21', '0910007694', '', 'pending', 'Beyemar', 474781787, '2025-12-17 06:39:24', '2025-12-17 06:39:24'),
(14, 1, 3, 360.00, 'CBE', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_41.jpg', '2025-12-17', '0984724911', '', 'pending', 'BereZkirkos', 814523272, '2025-12-17 11:08:50', '2025-12-17 11:08:50'),
(15, 14, 5, 360.00, 'Telebirr', 'https://api.telegram.org/file/bot7615692782:AAEAX7dvv8B0V2uY3WGa_UfFt7GkXlChlPA/photos/file_42.jpg', '2025-12-20', '0938101010', '', 'pending', 'kaldiscoffeee', 6492922880, '2025-12-17 11:42:11', '2025-12-17 11:42:11');

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
(1, 1, 5, 2, 80.00, '2025-12-15 20:21:48', '2025-12-15 20:21:48'),
(2, 2, 3, 2, 140.00, '2025-12-16 00:31:19', '2025-12-16 00:31:19'),
(3, 3, 5, 4, 80.00, '2025-12-16 00:51:17', '2025-12-16 00:51:17'),
(4, 4, 3, 5, 140.00, '2025-12-16 07:14:22', '2025-12-16 07:14:22'),
(5, 5, 5, 1, 80.00, '2025-12-16 08:42:05', '2025-12-16 08:42:05'),
(6, 5, 5, 3, 80.00, '2025-12-16 08:42:05', '2025-12-16 08:42:05'),
(7, 5, 2, 3, 150.00, '2025-12-16 08:42:05', '2025-12-16 08:42:05'),
(8, 5, 5, 2, 80.00, '2025-12-16 08:42:05', '2025-12-16 08:42:05'),
(9, 6, 4, 2, 180.00, '2025-12-16 10:24:14', '2025-12-16 10:24:14'),
(10, 6, 1, 3, 120.00, '2025-12-16 10:24:14', '2025-12-16 10:24:14'),
(11, 7, 2, 1, 150.00, '2025-12-16 10:25:26', '2025-12-16 10:25:26'),
(12, 8, 5, 4, 80.00, '2025-12-16 16:15:46', '2025-12-16 16:15:46'),
(13, 9, 3, 2, 140.00, '2025-12-16 16:18:52', '2025-12-16 16:18:52'),
(14, 9, 1, 3, 120.00, '2025-12-16 16:18:52', '2025-12-16 16:18:52'),
(15, 10, 4, 3, 180.00, '2025-12-16 16:28:39', '2025-12-16 16:28:39'),
(16, 11, 3, 3, 140.00, '2025-12-16 17:01:50', '2025-12-16 17:01:50'),
(17, 12, 4, 2, 180.00, '2025-12-17 06:33:03', '2025-12-17 06:33:03'),
(18, 13, 1, 2, 120.00, '2025-12-17 06:39:24', '2025-12-17 06:39:24'),
(19, 13, 2, 2, 150.00, '2025-12-17 06:39:24', '2025-12-17 06:39:24'),
(20, 14, 4, 2, 180.00, '2025-12-17 11:08:50', '2025-12-17 11:08:50'),
(21, 15, 4, 2, 180.00, '2025-12-17 11:42:11', '2025-12-17 11:42:11');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
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

INSERT INTO `products` (`id`, `name`, `description`, `price`, `image`, `available`, `created_at`, `updated_at`) VALUES
(1, 'Classic Torta', 'Delicious classic torta with fresh ingredients', 120.00, NULL, 1, '2025-12-15 19:47:11', '2025-12-15 19:47:11'),
(2, 'Chocolate Torta', 'Rich chocolate torta with premium cocoa', 2500.00, NULL, 1, '2025-12-15 19:47:11', '2025-12-23 06:15:20'),
(3, 'Fruit Torta', 'Fresh fruit torta with seasonal fruits', 140.00, NULL, 1, '2025-12-15 19:47:11', '2025-12-15 19:47:11'),
(4, 'Special Torta', 'Our signature special torta with unique ingredients', 180.00, NULL, 1, '2025-12-15 19:47:11', '2025-12-15 19:47:11'),
(5, 'Mini Torta', 'Small portion of our delicious torta', 80.00, NULL, 1, '2025-12-15 19:47:11', '2025-12-15 19:47:11');

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
(115, 1137601047, 'awaiting_product_selection', '{\"cart\":[]}', '2025-12-16 10:28:44'),
(119, 1301023557, 'awaiting_payment_method', '{\"cart\":[{\"product_id\":\"4\",\"name\":\"Special Torta\",\"price\":\"180.00\",\"quantity\":\"1\"}],\"current_product\":\"4\",\"branch_id\":\"4\",\"pickup_date\":\"2025-12-17\"}', '2025-12-16 11:11:07'),
(211, 1626288394, 'awaiting_order_id', '{\"customer_id\":12}', '2025-12-20 06:19:38');

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
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `branches`
--
ALTER TABLE `branches`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `user_states`
--
ALTER TABLE `user_states`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=212;

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
