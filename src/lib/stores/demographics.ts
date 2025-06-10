import { writable } from "svelte/store";
import type { UserDemographics } from "$lib/utils/types";

export const demographics = writable<UserDemographics>({});