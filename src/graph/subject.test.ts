import { deepStrictEqual as deepEqual, strictEqual as equal } from 'assert';
import stringify from 'json-stable-stringify';
import { action, autorun, computed, configure, runInAction } from 'mobx';
import { chunkProcessor, expr } from 'mobx-utils';
import sha256 from 'tiny-hashes/sha256';
import { symmetricGuard } from './guard';
import { Graph, Model } from './subject';

configure({
  enforceActions: 'always',
  disableErrorBoundaries: true,
});

function delay(ms = 1) {
  return new Promise((res) => setTimeout(res, ms));
}

const ifAtLeastTwoChars = symmetricGuard((u) =>
  typeof u === 'string' && u.length > 1 ? u : undefined,
);

class Comment extends Model {
  @computed
  get text() {
    return this.$.read(ifAtLeastTwoChars, 'text') || '';
  }
  set text(text) {
    this.$.write(ifAtLeastTwoChars, text, 'text');
  }

  @computed
  get response() {
    return this.$.read(Comment, 'response');
  }
  set response(response) {
    this.$.write(Comment, response, 'response');
  }
}

describe('Model', () => {
  it('set value', async () => {
    let currentState = 'a';

    const graph = new Graph({
      getState: () => currentState,
    });

    async function tick() {
      currentState = String.fromCharCode(currentState.charCodeAt(0) + 1);
      await delay(1);
      return graph.getState();
    }

    const state1 = graph.getState();

    const changes: any[] = [];
    const stopTrackingChanges = chunkProcessor(graph.changes, (items) => changes.push(items));

    deepEqual(changes.splice(0), []);

    let comment!: Comment;
    const keys: string[][] = [];
    const stopKeepingCommentAlive = autorun(() => {
      comment = graph.get(Comment, ['test']);
      keys.push(comment.$.keys());
    });

    const texts: any[] = [];

    await delay();

    const stopObserving = autorun(() => {
      try {
        texts.push(comment.text);
      } catch (e) {
        e.stack; //?
        e; //?
      }
    });

    equal(comment.text, '');
    deepEqual(texts.splice(0), ['']);
    deepEqual(keys.splice(0), [[]]);

    {
      comment.text = 'data';
      equal(comment.text, 'data');
      deepEqual(texts.splice(0), ['data']);
      deepEqual(changes.splice(0), [[[['test'], 'text', [state1, 'data']]]]);
      deepEqual(keys.splice(0), [['text']]);
    }

    const state2 = await tick();

    {
      comment.text = 'something else';
      equal(comment.text, 'something else');
      deepEqual(texts.splice(0), ['something else']);
      deepEqual(changes.splice(0), [
        [[['test'], 'text', [state2, 'something else'], [state1, 'data']]],
      ]);
      deepEqual(keys.splice(0), []); // nothing changed
    }

    const state2a = await tick();

    {
      comment.text = 'something else';
      equal(comment.text, 'something else');
      deepEqual(texts.splice(0), []);
      deepEqual(changes.splice(0), [
        [[['test'], 'text', [state2a, 'something else'], [state2, 'something else']]],
      ]);
      deepEqual(keys.splice(0), []); // nothing changed
    }

    /*const state3 =*/ await tick();

    {
      // setting to an invalid value results in no change
      // QUESTION: should this throw an error?
      comment.text = 'd';
      equal(comment.text, 'something else');
      deepEqual(texts.splice(0), []);
      deepEqual(changes.splice(0), []);
      deepEqual(keys.splice(0), []); // nothing changed
    }

    const state4 = await tick();

    {
      comment.response = comment;
      deepEqual(changes.splice(0), [[[['test'], 'response', [state4, [0, ['test']]]]]]);
      equal(comment.response?.text, 'something else');
      equal(comment.response, comment);
      deepEqual(keys.splice(0), [['text', 'response']]);
    }

    const state5 = await tick();

    {
      await (async () => (comment.response = null))();
      deepEqual(changes.splice(0), [
        [[['test'], 'response', [state5, null], [state4, [0, ['test']]]]],
      ]);
      equal(comment.response?.text ?? 'none', 'none');
      equal(comment.response, null);
      deepEqual(keys.splice(0), []); // nothing changed
    }

    stopObserving();
    stopTrackingChanges();
    stopKeepingCommentAlive();
  });

  it('supports immutable nodes', async () => {
    let currentState = 'a';

    const graph = new Graph({
      getState: () => currentState,
    });


    autorun((reaction) => {
      runInAction(() => {
        deepEqual(graph.changes.splice(0), []);
      });

      let comment = graph.get(Comment, ['test']);
      comment.text //?

      runInAction(() => {
        comment.text = "Test"
        deepEqual(graph.changes.splice(0), [[['test'], 'text', [currentState, 'Test']]]);
      });

      // same comment is returned
      equal(comment, graph.get(Comment, ['test']));

      // immutable stays immutable
      const ic = comment.$.immutable(Comment);
      equal(ic, ic.$.immutable(ic.constructor as any))
      equal(ic.text, 'Test')

      runInAction(() => {
        try {
          ic.text = "Value"
        } catch (e) {
          equal(e.message, "Node is immutable")
        }
      })

      runInAction(() => {
        const SHA = "bc4eede0ef6a82a2f1f9550ed54ba2bc73a9c1fc79ef3753300ed495a08b501c"
        deepEqual(graph.changes.splice(0), [[["$", SHA], 'text', [currentState, 'Test']]]);
        equal(sha256(stringify({
          text: [currentState, ic.text]
        })), SHA)
      });

      reaction.dispose();
    });


  });

  it('supports updates without computedFn warning', async () => {
    let currentState = 'a';

    const graph = new Graph({
      getState: () => currentState,
    });


    autorun((reaction) => {
      runInAction(() => {
        deepEqual(graph.changes.splice(0), []);
      });

      let comment = graph.get(Comment, ['test']);
      equal(graph.observed.size, 0);
      comment.text // trigger observer
      equal(graph.observed.size, 1);

      // temporarily catch console.warn calls
      const oldWarn = console.warn
      let error: string[] = [];
      console.warn = (...msg: string[]) => error = msg;

      // triggers no warning
      const response = graph.get(Comment, ['response1']);
      runInAction(() => {
        comment.response = response
        deepEqual(graph.changes.splice(0), [[['test'], 'response', [currentState, [0, ['response1']]]]]);
      });
      deepEqual(error, []);

      // triggers no warning    
      runInAction(() => {
        comment.response = graph.get(Comment, ['response2']);
        deepEqual(graph.changes.splice(0), [[['test'], 'response', [currentState, [0, ['response2']]], [currentState, [0, ['response1']]]]]);
      });
      deepEqual(error, []);

      // restore and stop
      console.warn = oldWarn;
      reaction.dispose();
    });

    equal(graph.observed.size, 0);
  });
  //   it('supports immutable data', async () => {
  //     let currentState = 'a';

  //     const graph = new Graph({
  //       getState: () => currentState,
  //     });

  //     async function tick() {
  //       currentState = String.fromCharCode(currentState.charCodeAt(0) + 1);
  //       await delay(1);
  //       return graph.getState();
  //     }

  //     const state1 = graph.getState();

  //     const changes: any[] = [];
  //     const stopTrackingChanges = chunkProcessor(graph.changes, (items) => changes.push(items));

  //     deepEqual(changes.splice(0), []);

  //     let comment!: Comment;
  //     const keys: string[][] = [];
  //     const stopKeepingCommentAlive = autorun(() => {
  //       comment = graph.get(Comment, ['test']);
  //       keys.push(comment.$.keys());
  //     });

  //     const texts: any[] = [];

  //     await delay();

  //     const stopObserving = autorun(() => {
  //       try {
  //         texts.push(comment.text);
  //       } catch (e) {
  //         e.stack; //?
  //         e; //?
  //       }
  //     });

  //     equal(comment.text, '');
  //     deepEqual(texts.splice(0), ['']);
  //     deepEqual(keys.splice(0), [[]]);

  //     {
  //       comment.text = 'data';
  //       equal(comment.text, 'data');
  //       deepEqual(texts.splice(0), ['data']);
  //       deepEqual(changes.splice(0), [[[['test'], 'text', [state1, 'data']]]]);
  //       deepEqual(keys.splice(0), [['text']]);
  //     }

  //     const state2 = await tick();

  //     {
  //       let i!: Comment
  //       equal(graph.changes.length, 0);

  //       const stop = autorun(() => {
  //         i = comment.$.immutable(Comment);
  //       });

  //       equal(i.text, 'data');
  //       equal(i.$.immutable(i.constructor as any), i);

  //       const state2 = await tick();

  //       equal(graph.changes.length, 1);

  //       deepEqual(changes.splice(0), []);
  //       stop();
  //     }


  //     stopObserving();
  //     stopTrackingChanges();
  //     stopKeepingCommentAlive();
  //   });

});
