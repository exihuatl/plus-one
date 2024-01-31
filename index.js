import axios from "axios";
import promisePoller from "promise-poller";
import _ from "lodash";
import { benefits, industries, recruitments } from "./constants.js";
import { API_KEY, GOOGLE_API_ID, GOOGLE_API_KEY } from "./env.js";
import { hebeSource } from "./sources/index.js";
import { expected } from "./expected.js";

const BASE_URL =
  "https://g6ygf5mh0i.execute-api.eu-west-1.amazonaws.com/development/api/v1/openai/";

(async function () {
  const headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const companyName = "hebe";

  const googleSearchResult = await axios.get(
    `https://www.googleapis.com/customsearch/v1?q=${companyName}+polska+siedziba+kontakt+adres+-gowork&key=${GOOGLE_API_KEY}&cx=${GOOGLE_API_ID}`,
  );

  const path = "chat-completion/submit";
  const keys = [
    "description",
    "title",
    "apply_url",
    "categories",
    "parameters",
    "country",
    "logoUrl",
  ];

  const message = `
    You are writing a company profile for the company in the job category.
    Write a JSON object based on the data provided that conforms to the EXPECTED.

    To fill headquarters, companyUrl, email, phone fields search for them, but do not use real time data.
    If there are multiple values, select the first one.
    Retrieved location should be within the country.Country code is available in field "country".

    For benefits, industry, recruitment - select from the list of possible values that suits best to the provided source.
    For the logoUrl field, use the largest square image available.

    Answer only when you are sure that the data is correct.

    Translate everything to english.
  `;

  const messages = [
    {
      role: "system",
      content:
        "You return JSON output. Keys should be in english, and values - in polish.",
    },
    {
      role: "system",
      content: `
        GOOGLE_SEARCH = ${JSON.stringify(googleSearchResult.data.items.slice(0, 2).map((x) => _.pick(x, ["title", "link", "snippet"])))}
      `,
    },
    {
      role: "system",
      content: `
      SOURCE = ${JSON.stringify(hebeSource.data.map((x) => _.pick(x, keys)))};
      `,
    },
    {
      role: "system",
      content: `
  EXPECTED = ${JSON.stringify(expected)};
  `,
    },
    {
      role: "system",
      content: `
        RECRUITMENTS = ${JSON.stringify(recruitments)};
      `,
    },
    {
      role: "system",
      content: `
  BENEFITS = ${JSON.stringify(benefits)};
  `,
    },
    {
      role: "system",
      content: `
  INDUSTRIES = ${JSON.stringify(industries)};
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
