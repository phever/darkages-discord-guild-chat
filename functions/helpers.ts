const DOTENV_DELIMITER = ",";

export function loadParams(key: string): string[] {
  if (process.env[key]) {
    if (process.env[key].includes(DOTENV_DELIMITER)) {
      return process.env[key].split(DOTENV_DELIMITER);
    }
    return [process.env[key]];
  }

  // return the environment key or exit
  console.log(`.env key "${key}" not found, please fix this and run again`);
  process.exit(1);
}

export function loadParam(key: string): string {
  if (process.env[key]) {
    return process.env[key];
  }

  console.log(`.env key "${key}" not found, please fix this and run again`);
  process.exit(1);
}
