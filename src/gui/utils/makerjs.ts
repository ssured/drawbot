import m from "makerjs";
import { simplify } from "./clip";

export function toPaths(model: m.IModel, tolerance = 0.01): m.IModel {
  const chains = (m.model.findChains(model) || []) as m.IChain[];

  const models = chains.reduce((memo, chain, i) => {
    const divisions = Math.floor(chain.pathLength / tolerance);
    const spacing = chain.pathLength / divisions;
    const keyPoints = m.chain.toKeyPoints(chain, spacing);

    if (chain.endless) {
      keyPoints.push(keyPoints[0]);
    }

    memo[`${i}`] = new m.models.ConnectTheDots(
      chain.endless,
      simplify(keyPoints as any)
    );

    return memo;
  }, {} as m.IModelMap);
  return {
    models,
  };
}
