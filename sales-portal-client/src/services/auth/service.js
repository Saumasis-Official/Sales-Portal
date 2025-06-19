

import axios from "axios";
import * as API from "../../api/index";

export const AuthService = {
    refreshToken(param) {
        return axios
            .get(API.url("refresh-token", "auth"))
            .then(response => {
                return response.data;
            })
            .catch(error => {

            });
    },
}