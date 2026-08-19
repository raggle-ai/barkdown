import assert from "node:assert/strict";
import test from "node:test";

import { remarkGithubEmojiImages } from "../dist/emoji.js";

test("remarkGithubEmojiImages converts GitHub-style shortcodes to inline images", () => {
  const tree = {
    type: "root",
    children: [
      {
        type: "paragraph",
        children: [
          {
            type: "text",
            value: ":thumbsup: :rocket: :white_check_mark: :not_real:",
          },
        ],
      },
    ],
  };

  remarkGithubEmojiImages()(tree);

  const children = tree.children[0].children;
  assert.equal(children[0].type, "image");
  assert.equal(children[0].alt, ":thumbsup:");
  assert.equal(
    children[0].url,
    "https://github.githubassets.com/images/icons/emoji/unicode/1f44d.png?v8",
  );
  assert.equal(children[2].type, "image");
  assert.equal(children[2].alt, ":rocket:");
  assert.equal(
    children[2].url,
    "https://github.githubassets.com/images/icons/emoji/unicode/1f680.png?v8",
  );
  assert.equal(children[4].type, "image");
  assert.equal(children[4].alt, ":white_check_mark:");
  assert.equal(
    children[4].url,
    "https://github.githubassets.com/images/icons/emoji/unicode/2705.png?v8",
  );
  assert.equal(children.at(-1).value, " :not_real:");
});
