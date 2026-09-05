# Contributing to BarkDown

Thanks for taking the time to contribute.

The following guidelines apply to BarkDown as an independent Raggle project.
BarkDown was forked from
[volca/markdown-preview](https://github.com/volca/markdown-preview), but new
work should target this repository unless a maintainer says otherwise.

## Working with Git and GitHub

_Pull requests for new features and major fixes should be opened against the `master` branch._

Avoid intermediate merge commits. [Rebase](https://www.atlassian.com/git/tutorials/merging-vs-rebasing) your feature branch onto `master` to pull updates and verify your local changes against them before placing the pull request.

### General flow

1. Clone the BarkDown repository:

   ```bash
   git clone https://github.com/raggle-ai/barkdown.git
   cd barkdown
   ```

1. Create a branch from `master`:

   ```bash
   git checkout master
   git pull --ff-only
   git checkout -b <branch-name>
   ```

1. Make the change and commit it with a clear message.
1. Rebase on the current `master` before you open a pull request:

   ```bash
   git fetch origin
   git rebase origin/master
   ```

1. Push the branch and open a pull request against `raggle-ai/barkdown`.

This is just one way of doing things. If you're proficient in Git matters you're free to choose your own. If you want to read more then the [GitHub chapter in the Git book](http://git-scm.com/book/en/v2/GitHub-Contributing-to-a-Project#The-GitHub-Flow) is a way to start. [GitHub's own documenation](https://help.github.com/categories/collaborating/) contains a wealth of information as well.

## Commit messages

From: [http://git-scm.com/book/ch5-2.html](http://git-scm.com/book/ch5-2.html)
<pre>
Short (50 chars or less) summary of changes

More detailed explanatory text, if necessary.  Wrap it to about 72
characters or so.  In some contexts, the first line is treated as the
subject of an email and the rest of the text as the body.  The blank
line separating the summary from the body is critical (unless you omit
the body entirely); tools like rebase can get confused if you run the
two together.

Further paragraphs come after blank lines.

 - Bullet points are okay, too

 - Typically a hyphen or asterisk is used for the bullet, preceded by a
   single space, with blank lines in between, but conventions vary here
</pre>

Don't forget to [reference affected issues](https://help.github.com/articles/closing-issues-via-commit-messages/) in the commit message to have them closed automatically on GitHub.

[Amend](https://help.github.com/articles/changing-a-commit-message/) your commit messages if necessary to make sure what the world sees on GitHub is as expressive and meaningful as possible.
