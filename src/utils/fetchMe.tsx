import { endpoint } from "../config/config";

export default async function(callback: () => void) {
  await fetch(endpoint + "/users/@me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
    },
  }).then((res) => {
    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.reload();
    }
    return res.json();
  }).then((data) => {
    localStorage.setItem("verificationKey", data.verificationKey);
    window.me = data;
    callback();
  });
}