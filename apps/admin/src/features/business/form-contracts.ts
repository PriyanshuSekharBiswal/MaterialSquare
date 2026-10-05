import type { FormEvent } from "react";

export type FormSubmit = (
  event: FormEvent<HTMLFormElement>,
  makeBody: (form: FormData) => unknown,
  url?: string,
  method?: string,
) => Promise<boolean>;

export type Mutate = (
  url: string,
  method: string,
  body: unknown,
) => Promise<boolean>;
