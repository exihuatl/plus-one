import axios from "axios";
import promisePoller from "promise-poller";
import _ from "lodash";
import { benefits, industries } from "./constants.js";
import { API_KEY } from "./env.js";
import { hebeSource } from "./sources/index.js";

const BASE_URL =
  "https://g6ygf5mh0i.execute-api.eu-west-1.amazonaws.com/development/api/v1/openai/";

(async function () {
  const headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const path = "chat-completion/submit";
  const keys = [
    "description",
    "title",
    "location",
    "url",
    "apply_url",
    "categories",
    "parameters",
  ];

  const message = `
    write a JSON based on the data provided with the following keys: industries, benefits, companyName, location. Pick one at random from the list of possible values.
  `;

  const messages = [
    {
      role: "system",
      content:
        "You return JSON output. Keys should be in english, and values - in polish.",
    },
    {
      role: "user",
      content: `
        SOURCE = ${JSON.stringify(hebeSource.data.map((x) => _.pick(x, keys)))}
      `,
    },
    {
      role: "user",
      content: `
        BENEFITS = ${JSON.stringify(benefits)}
      `,
    },
    {
      role: "user",
      content: `
        INDUSTRIES = ${JSON.stringify(industries)}
      `,
    },
    {
      role: "user",
      content: message,
    },
  ];

  const data = {
    messages,
    temperature: 0,
    top_p: 1,
    n: 1,
  };

  try {
    const requestIdResponse = await axios({
      method: "POST",
      baseURL: BASE_URL,
      url: path,
      headers,
      data,
    });

    const result = await promisePoller.default({
      taskFn: () =>
        axios({
          method: "GET",
          baseURL: BASE_URL,
          url: "result/" + requestIdResponse.data.request_id,
          headers,
        }).then((response) => {
          console.log(
            new Date().toLocaleTimeString(),
            ":  ",
            response.data.status_code,
          );

          if (response.data.finished) {
            return Promise.resolve(response.data);
          } else {
            return Promise.reject(response.data);
          }
        }),
      retries: 20,
      interval: 5000, // Poll every 5 seconds
    });

    console.log("@result", result.response);
  } catch (error) {
    console.error("@error", error);
  }
})();
