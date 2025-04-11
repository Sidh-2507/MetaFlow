// src/authService.js
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";

// Cognito User Pool configuration
const poolData = {
  UserPoolId: process.env.REACT_APP_USER_POOL_ID,
  ClientId: process.env.REACT_APP_CLIENT_ID,
};

const userPool = new CognitoUserPool(poolData);

export function loginUser(email, password, callback) {
  const user = new CognitoUser({ Username: email, Pool: userPool });
  const authDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  });

  user.authenticateUser(authDetails, {
    // login success
    onSuccess: (session) => {
      const token = session.getIdToken().getJwtToken();
      localStorage.setItem("jwtToken", token);
      callback(null, token);
    },
    // login failure
    onFailure: (err) => {
      callback(err);
    },

    newPasswordRequired: function (userAttributes, requiredAttributes) {
      // Remove immutable attributes
      delete userAttributes.email;
      delete userAttributes.email_verified;

      // set new password as required using the same old password

      user.completeNewPasswordChallenge(password, userAttributes, {
        onSuccess: (session) => {
          const token = session.getIdToken().getJwtToken();
          localStorage.setItem("jwtToken", token);
          callback(null, token);
        },
        onFailure: (err) => {
          console.error("Challenge failed:", err);
          callback(err);
        },
      });
    },
  });
}
