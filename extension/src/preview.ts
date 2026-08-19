type PreviewMessage = {
  type: "open-folder";
  url: string;
};

type SendMessage = (message: PreviewMessage) => Promise<unknown>;

export async function requestPreview(url: string, send: SendMessage) {
  const response = await send({ type: "open-folder", url });
  if (response && typeof response === "object") {
    if ("url" in response && typeof response.url === "string")
      return response.url;
    if ("error" in response && typeof response.error === "string") {
      throw new Error(response.error);
    }
  }
  throw new Error("Could not open the folder viewer");
}
