# Kaldis Torta Orders Sync System

This is a standalone PHP system designed to synchronize orders from the `kaldis_torta_orders` database into the main Company System's `pre_orders` table.

## Setup
1.  **Location**: This system is currently located at `C:\wamp64\www\company-system-main\torta-sync`.
2.  **Database**: It connects to:
    *   Source: `kaldis_torta_orders`
    *   Destination: `company_system`
3.  **Credentials**: Update `config.php` if your database username or password is not the default (`root` / no password).

## How to Sync
1.  Open your browser to `http://localhost/company-system-main/torta-sync/index.php`.
2.  Click the **Refresh Orders** button.
3.  The system will:
    *   Identify new orders by prefixing their source ID with `TOR-`.
    *   Map branch names and product names automatically (case-insensitive).
    *   Map pickup dates to the corresponding collection day.
    *   Import all order items and calculate subtotals.
    *   Avoid duplicates by checking existing `TOR-` order numbers.

## Data Mapping Notes
- **Status Mapping**:
    - `pending` -> `Pending`
    - `confirmed` -> `Paid`
    - `completed` -> `Collected`
    - `cancelled` -> `Cancelled`
- **Payment Method**: Prepended to the `notes` field.
- **Payment Slip**: The Telegram photo URL is stored in the `transaction_reference` field.
- **Created By**: All synced orders are attributed to the user with ID `1`.

## Moving to a Separate Folder
If you want this system to be outside the main codebase:
1.  Move the `torta-sync` folder to `C:\wamp64\www\kaldis-torta-sync`.
2.  Access it via `http://localhost/kaldis-torta-sync/index.php`.
