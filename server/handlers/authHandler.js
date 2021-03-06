/**
 * @module authHandler
 */

const userController = require('../dbControllers/userController');
const jwt = require('jwt-simple');
const passport = require('../passportConfig');
const config = require('../../config');

const ensureAuthenticated = passport.authenticate('jwt', { session: false });

const generateJWT = (userInstance) => {
  const payload = {
    id: userInstance.id,
    emailAddress: userInstance.emailAddress,
    name: userInstance.name,
    squareId: userInstance.squareId,
    paypalId: userInstance.paypalId,
  };
  return jwt.encode(payload, config.jwt.secret, 'HS512');
};

const loginHandler = (request, response) => {
  const emailAddress = request.body.emailAddress;
  const password = request.body.password;
  userController.findUserByEmailAddress(emailAddress)
    .then((userInstance) => {
      if (!userInstance) {
        return response.status(400).json({
          error: {
            message: 'Incorrect email address or password',
          },
        });
      }
      return userController.verifyUser(emailAddress, password)
        .then((match) => {
          if (!match) {
            return response.status(400).json({
              error: {
                message: 'Incorrect email address or password',
              },
            });
          }
          return response.status(201).json({
            data: {
              message: 'Successfully generated user token',
              token: generateJWT(userInstance),
            },
          });
        });
    })
    .catch(() => response.status(500).json({
      error: {
        message: 'There was an error processing your login.',
      },
    }));
};

const signupHandler = (request, response) => {
  userController.findUserByEmailAddress(request.body.emailAddress)
    .then((userInstance) => {
      if (userInstance) {
        return response.status(400).json({
          error: {
            message: 'User already exists.',
          },
        });
      }
      // user does not exist
      return userController.createUser(request.body)
        .then(createdUserInstance =>
          response.status(201).json({
            data: {
              message: 'Successfully created user and generated user token',
              token: generateJWT(createdUserInstance),
            },
          })
        )
        .catch(() =>
          response.status(400).json({
            error: {
              message: 'There was a problem creating the user',
            },
          })
        );
    });
};

const updateUserHandler = (request, response) => {
  const userId = request.params.id;
  const loggedInUserId = request.user.id;
  if (+userId !== +loggedInUserId) {
    return response.status(403).json({
      error: {
        message: 'You may not edit other user\'s data',
      },
    });
  }
  return userController.updateUser(userId, request.body)
    .then((userInstance) => {
      response.status(200).json({
        data: {
          message: 'User successfully updated. New token included',
          token: generateJWT(userInstance),
        },
      });
    })
    .catch(() => response.status(500).json({
      error: {
        message: 'There was an error updating the user',
      } })
    );
};

module.exports = {
  ensureAuthenticated,
  loginHandler,
  signupHandler,
  updateUserHandler,
};
