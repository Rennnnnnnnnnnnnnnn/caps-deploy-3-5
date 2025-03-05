
import db from '../config/database.js'; // Assuming your DB connection is set up correctly
import express from 'express';
const router = express.Router();

// DELETE A TRANSACTION
export const deleteTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;  // Get ID from URL parameters

        // SQL query to delete the transaction by ID
        const query = 'DELETE FROM transactions WHERE transaction_id = ?';

        const [result] = await db.execute(query, [id]);

        if (result.affectedRows === 0) {
            const error = new Error('Transaction not found');
            error.status = 404;
            console.log(error);
            return next(error);
        }
        res.json({ message: 'Transaction deleted successfully' });
    } catch (err) {
        const error = new Error('Unable to delete transaction');
        error.status = 500;
        console.log(error);
        return next(error);
    }
};


// // ADD TRANSACTION
// export const addTransaction = async (req, res, next) => {
//     const connection = await db.getConnection();
//     try {
//         const { batchId, transactionDate, transactionType, itemType, contactName, quantity, pricePerUnit, totalCost } = req.body;

//         // Validate if any required fields are missing
//         if (!batchId || !transactionDate || !transactionType || !itemType || !contactName || !quantity || !pricePerUnit || !totalCost) {
//             const error = new Error('All fields are required.');
//             error.status = 400;
//             return next(error);
//         }

//         // Check if the batchId exists in the batch table
//         const [batch] = await db.execute('SELECT * FROM batch WHERE batch_id = ?', [batchId]);

//         if (!batch || batch.length === 0) {
//             const error = new Error('Batch ID does not exist.');
//             error.status = 400;
//             return next(error);
//         }

//         const transactionQuery = 'INSERT INTO transactions (transaction_date, transaction_type, item_type, quantity, price_per_unit, total_Cost, contact_name, batch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
//         const [results] = await db.execute(transactionQuery, [transactionDate, transactionType, itemType, quantity, pricePerUnit, totalCost, contactName, batchId]);

//         // After inserting the transaction, insert into the inventory table
//         // const inventoryQuery = 'INSERT INTO inventory (batch_id, item_type, quantity) VALUES (?, ?, ?)';
//         // await db.execute(inventoryQuery, [batchId, itemType, quantity]);

//         // let inventoryQuery;
//         // switch (itemType) {
//         //     // case 'Chicks':
//         //     //     inventoryQuery = 'INSERT INTO chicks_inv (batch_id, item_type, quantity) VALUES (?, ?, ?)';
//         //     //     break;
//         //     case 'Feeds: Chick Booster':
//         //         inventoryQuery = 'INSERT INTO feeds_chickbooster_inv (quantity, batch_id) VALUES (?, ?)';
//         //         break;
//         //     case 'Feeds: Starter':
//         //         inventoryQuery = 'INSERT INTO feeds_starter_inv (quantity, batch_id) VALUES (?, ?)';
//         //         break;
//         //     case 'Vitamins: Atobe':
//         //         inventoryQuery = 'INSERT INTO vitamins_atobe_inv (quantity, batch_id) VALUES (?, ?)';
//         //         break;
//         //     case 'Vitamins: Molases':
//         //         inventoryQuery = 'INSERT INTO vitamins_molases_inv (quantity, batch_id) VALUES (?, ?)';
//         //         break;
//         //     default:
//         //         const error = new Error('Invalid item type.');
//         //         error.status = 400;
//         //         return next(error);
//         // }

//         // // Insert into the determined inventory table
//         // await db.execute(inventoryQuery, [quantity, batchId]);

//         // Commit the changes
//         await connection.commit();

//         res.status(201).json({
//             message: 'Transaction added successfully',
//             data: {
//                 id: results.insertId,
//                 transactionDate,
//                 transactionType,
//                 itemType,
//                 quantity,
//                 pricePerUnit,
//                 totalCost,
//                 contactName,
//                 batchId
//             }
//         });
//     } catch (err) {
//         await connection.rollback();
//         console.error('Error details:', err);
//         const error = new Error('Unable to insert transaction');
//         return next(error);
//     } finally {
//         connection.release();
//     }
// };


// ADD TRANSACTION
export const addTransaction = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        const {
            batchId,
            transactionDate,
            transactionType,
            itemType,
            itemName,
            contactName,
            quantity,
            pricePerUnit,
            totalCost
        } = req.body;

      

        // Check if the batchId exists in the batch table
        const [batch] = await db.execute('SELECT * FROM batch WHERE batch_id = ?', [batchId]);

        if (!batch || batch.length === 0) {
            const error = new Error('Batch ID does not exist.');
            error.status = 400;
            return next(error);
        }

        // If totalCost is not provided by the frontend, calculate it
        const computedTotalCost = totalCost || (quantity * pricePerUnit);

        // Insert the transaction into the transactions table
        const transactionQuery = `
            INSERT INTO transactions
            (transaction_date, transaction_type, item_type, item_name, quantity, price_per_unit, total_cost, contact_name, batch_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const [results] = await db.execute(transactionQuery, [
            transactionDate,
            transactionType,
            itemType,
            itemName,
            quantity,
            pricePerUnit,
            computedTotalCost,
            contactName,
            batchId
        ]);

        // Check if the transaction type is 'Expense' and item type is 'Chicks', 'Feeds', or 'Supplements'
        if (transactionType === "Expense" && (itemType === "Chicks" || itemType === "Feeds" || itemType === "Supplements")) {
            // Prepare the inventory queries
            let checkQuery, updateQuery, inventoryQuery;

            switch (itemType) {
                case 'Chicks':
                    checkQuery = 'SELECT * FROM chicks_inv WHERE item_name = ? AND item_type = ? AND batch_id = ?';
                    updateQuery = 'UPDATE chicks_inv SET amount_left = amount_left + ? WHERE item_name = ? AND item_type = ? AND batch_id = ?';
                    inventoryQuery = 'INSERT INTO chicks_inv(date, item_type, item_name, amount_left, batch_id) VALUES (?, ?, ?, ?, ?)';
                    break;
                case 'Feeds':
                    checkQuery = 'SELECT * FROM feeds_inv WHERE item_name = ? AND item_type = ? AND batch_id = ?';
                    updateQuery = 'UPDATE feeds_inv SET amount_left = amount_left + ? WHERE item_name = ? AND item_type = ? AND batch_id = ?';
                    inventoryQuery = 'INSERT INTO feeds_inv(date, item_type, item_name, amount_left, batch_id) VALUES (?, ?, ?, ?, ?)';
                    break;
                case 'Supplements':
                    checkQuery = 'SELECT * FROM supplements_inv WHERE item_name = ? AND item_type = ? AND batch_id = ?';
                    updateQuery = 'UPDATE supplements_inv SET amount_left = amount_left + ? WHERE item_name = ? AND item_type = ? AND batch_id = ?';
                    inventoryQuery = 'INSERT INTO supplements_inv(date, item_type, item_name, amount_left, batch_id) VALUES (?, ?, ?, ?, ?)';
                    break;
                default:
                    const error = new Error('Invalid item type.');
                    error.status = 400;
                    return next(error);
            }

            // Check if the item already exists in inventory
            const [existingInventory] = await db.execute(checkQuery, [itemName, itemType, batchId]);

            if (existingInventory.length > 0) {
                // The item exists, update the amount_left
                await db.execute(updateQuery, [quantity, itemName, itemType, batchId]);
            } else {
                // The item doesn't exist, insert a new record
                await db.execute(inventoryQuery, [transactionDate, itemType, itemName, quantity, batchId]);
            }

            // Commit the changes
            await connection.commit();

            res.status(201).json({
                message: 'Transaction added successfully and inventory updated',
                data: {
                    id: results.insertId,
                    transactionDate,
                    transactionType,
                    itemType,
                    quantity,
                    pricePerUnit,
                    totalCost: computedTotalCost,
                    contactName,
                    batchId
                }
            });
        } else {
            // If transaction type is not 'Expense' or item type is not in the list, just commit without updating inventory
            await connection.commit();

            res.status(201).json({
                message: 'Transaction added successfully without adding to inventory',
                data: {
                    id: results.insertId,
                    transactionDate,
                    transactionType,
                    itemType,
                    quantity,
                    pricePerUnit,
                    totalCost: computedTotalCost,
                    contactName,
                    batchId
                }
            });
        }

    } catch (err) {
        await connection.rollback();
        console.error('Error details:', err);
        const error = new Error('Unable to insert transaction');
        return next(error);
    } finally {
        connection.release();
    }
};











// GET ALL TRANSACTIONS FOR A SPECIFIC BATCH
export const getTransactions = async (req, res, next) => {
    const { batchId } = req.params;  // Retrieve batchId from the request parameters

    try {
        const [results] = await db.execute(
            `SELECT t.* 
             FROM transactions t
             INNER JOIN batch b ON t.batch_id = b.batch_id
             WHERE t.batch_id = ? AND b.is_active = 1
             ORDER BY t.transaction_date DESC`,
            [batchId]
          );
                  res.json(results);  // Send the transactions as a JSON response
    } catch (err) {
        console.log(error);
        const error = new Error('Unable to fetch transactions');
        error.status = 500;
        console.log(error);
        return next(error);
    }
};

// Get a Single Transaction by ID:
export const getTransactionById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await db.execute('SELECT * FROM transactions WHERE id = ?', [id]);

        if (result.length === 0) {
            const error = new Error('Transaction not found');
            error.status = 404;
            return next(error);
        }
        res.json(result[0]);
    } catch (err) {
        const error = new Error('Unable to fetch transaction');
        error.status = 500;
        return next(error);
    }
};


// Update a Transaction:
export const editTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;  // Get ID from URL parameters
        const { batchId, transactionDate, transactionType, contactName, itemType, itemName, quantity, pricePerUnit, totalCost, } = req.body;
        // Validate if required fields are provided
        // if (!batchId || !transactionDate || !transactionType || !contactName || !itemType || !itemName || !quantity || !pricePerUnit || !totalCost) {
        //     const error = new Error('All fields are required.');
        //     error.status = 400;
        //     return next(error);
        // }

        // SQL query to update the transaction data
        const query = `UPDATE transactions 
                       SET transaction_date = ?, transaction_Type = ?, contact_name = ?, item_type = ?,  item_name = ?, quantity = ?, price_per_unit = ?, total_cost = ?
                       WHERE transaction_id = ?`;

        const [result] = await db.execute(query, [transactionDate, transactionType, contactName, itemType, itemName, quantity, pricePerUnit, totalCost, id]);

        if (result.affectedRows === 0) {
            const error = new Error('Transaction not found');
            error.status = 404;
            return next(error);
        }

        res.json({ message: 'Transaction updated successfully' });
    } catch (err) {
        console.error("Error:", err)
        const error = new Error('Unable to update transaction');
        error.status = 500;
        return next(error);
    }
};






