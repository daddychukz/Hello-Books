import model from '../models';

const Book = model.Book;
const Borrow = model.Borrow;
/**
 *
 */
class BorrowController {
  /**
   *
   *
   * @static
   * @description Borrow a book
   * @param {any} req
   * @param {any} res
   * @returns
   *
   * @memberOf BorrowController
   */
  static create(req, res) {
    // First checks if book has been borrowed and not returned
    return Borrow
      .findOne({
        where: {
          userId: req.params.userId,
          bookId: req.body.bookId,
          returned: false,
        },
        include: [
          { model: Book, as: 'book', required: true },
        ],
      }).then((foundBorrow) => {
        /**
         * If book has been borrowed before and not returned,
         * User cannot borrow same book again.
         */
        if (foundBorrow) {
          return res.status(409).send({ success: false, messsage: 'Conflict! Book borrowed already', foundBorrow });
        }
        // Else, user is eligible to borrow book
        return Borrow
          .create({
            returned: false,
            userId: req.params.userId,
            bookId: req.body.bookId,
            dueDate: new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)),
            actualReturnDate: Date.now(),
          })
          .then(() => {
            // Ensures book is available and not borrowed out.
            Book
              .findOne({
                where: {
                  id: req.body.bookId,
                },
              })
              .then((foundBorrowedBook) => {
                // If book is borrowed out, then No book to borrow
                if (!foundBorrowedBook || foundBorrowedBook.quantity === 0) {
                  return res.status(404).send({ success: false, message: 'Book not found' });
                }
                /**
                 * But if book is available, User can borrow book
                 * with the count decreased by one
                 */
                return foundBorrowedBook
                  .update({
                    quantity: foundBorrowedBook.quantity - 1,
                  })
                  .then((updatedBorrowedBook) => {
                    res.status(200).send({ success: true, message: `${updatedBorrowedBook.title} succesfully borrowed`, updatedBorrowedBook });
                  })
                  .catch((error) => {
                    res.status(400).send({ success: false, message: `Oops! something happened, ${error.message}` });
                  });
              })
              .catch((error) => {
                res.status(400).send({ success: false, message: `Oops! something happenned ${error.message}` });
              });
          })
          .catch(() => { res.status(400).send({ success: false, message: 'Oops! Check entered UserId or BookId and ensure its valid input' }); });
      })
      .catch((error) => {
        res.status(400).send({ success: false, message: `drOops! something happened, ${error.message}` });
      });
  }
  /**
   *
   *
   * @static
   * @description Return borrowed book
   * @param {any} req
   * @param {any} res
   * @returns
   *
   * @memberOf BorrowController
   */
  static returnBook(req, res) {
    // Check if book has been borrowed before and returned
    return Borrow
      .findOne({
        where: {
          userId: req.params.userId,
          bookId: req.body.bookId,
          returned: true,
        },
        include: [
          { model: Book, as: 'book', required: true },
        ],
      }).then((foundBorrow) => {
        // If borrowed and returned, then you have no business returning again.
        if (foundBorrow) {
          return res.status(409).send({ success: false, messsage: 'Conflict! Book returned already', foundBorrow });
        }
        // Else, allows to return
        return Borrow
          .update({
            returned: true, // Sets returned status to true
            actualReturnDate: Date.now(), // Updates returned date to now
          }, {
            where: { userId: req.params.userId, bookId: req.body.bookId },
          })
          .then(() => {
            // Searches if book is available in the database
            Book
              .findOne({
                where: {
                  id: req.body.bookId,
                },
              })
              .then((foundBorrowedBook) => {
                if (!foundBorrowedBook || foundBorrowedBook.quantity === 0) {
                  return res.status(404).send({ success: false, message: 'Book not found' });
                }
                // Book is returned with the count increased by one
                return foundBorrowedBook
                  .update({
                    quantity: foundBorrowedBook.quantity + 1,
                  })
                  .then((updatedBorrowedBook) => {
                    res.status(200).send({ success: true, message: `${updatedBorrowedBook.title} succesfully returned but pending review by Administrator`, updatedBorrowedBook });
                  })
                  .catch((error) => {
                    res.status(400).send({ success: false, message: `Oops! something happened, ${error.message}` });
                  });
              })
              .catch((error) => {
                res.status(400).send({ success: false, message: `Oops! something happenned ${error.message}` });
              });
          })
          .catch((error) => { res.status(400).send({ success: false, message: `Oops! something happened, ${error.message}` }); });
      })
      .catch((error) => {
        res.status(400).send({ success: false, message: `Oops! something happened, ${error.message}` });
      });
  }
  /**
   *
   *
   * @static
   * @description List all books borrowed but not returned by a User.
   * @param {any} req
   * @param {any} res
   * @returns
   *
   * @memberOf BorrowController
   */
  static listNotReturned(req, res) {
    return Borrow
      .findAll({
        where: {
          userId: req.params.userId,
          returned: req.query.returned,
        },
        include: [
          { model: Book, as: 'book', required: true },
        ],
      })
      .then((borrow) => {
        if (borrow.length < 1) {
          return res.status(404).send({ success: false, message: 'You have no books to return' });
        }
        const p = [];
        for (let i = 0; i < borrow.length; i += 1) {
          p[i] = borrow[i].book; // For now let's not use this
        }
        return res.status(200).send({ success: true, borrow });
      })
      .catch((error) => { res.send(error.toString()); });
  }
}

export default BorrowController;
