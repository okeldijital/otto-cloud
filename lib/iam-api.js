import axios from 'axios';

/**
 * Canonical IAM API client.
 *
 * Uses the Better Auth cookie-backed session and never reads a legacy
 * localStorage bearer token.
 */
const iamApi = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export default iamApi;
