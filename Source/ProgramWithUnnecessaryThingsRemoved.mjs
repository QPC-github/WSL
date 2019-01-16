/*
 * Copyright 2018 Apple Inc.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *    1. Redistributions of source code must retain the above copyright notice,
 *       this list of conditions and the following disclaimer.
 *
 *    2. Redistributions in binary form must reproduce the above copyright notice,
 *       this list of conditions and the following disclaimer in the documentation
 *       and/or other materials provided with the distribution.
 *
 *    3. Neither the name of the copyright holder nor the names of its
 *       contributors may be used to endorse or promote products derived from this
 *       software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import { Anything } from "./NameContext.mjs";
import { NameFinder } from "./NameFinder.mjs";
import { Program } from "./Program.mjs";
import { StatementCloner } from "./StatementCloner.mjs";

export function programWithUnnecessaryThingsRemoved(program)
{
    let nameFinder = new NameFinder();

    // Build our roots.
    for (let statement of program.topLevelStatements) {
        if (statement.origin.originKind === "user")
            nameFinder.add(statement.name);
    }

    // Unfortunately, we cannot know yet which operator casts we'll need.
    nameFinder.add("operator cast");

    // We need these even if the program doesn't mention them by name.
    nameFinder.add("void");
    nameFinder.add("bool");
    nameFinder.add("int");
    nameFinder.add("uint");
    nameFinder.add("float");
    nameFinder.add("vector");
    nameFinder.add("matrix");
    nameFinder.add("sampler");
    nameFinder.add("ddx");
    nameFinder.add("ddy");
    nameFinder.add("AllMemoryBarrierWithGroupSync");
    nameFinder.add("DeviceMemoryBarrierWithGroupSync");
    nameFinder.add("GroupMemoryBarrierWithGroupSync");

    // Pull in things as necessary.
    while (nameFinder.worklist.length) {
        let name = nameFinder.worklist.pop();
        for (let thing of program.globalNameContext.underlyingThings(Anything, name))
            thing.visit(nameFinder);
    }

    let result = new Program();
    let cloner = new StatementCloner();
    for (let name of nameFinder.set) {
        for (let thing of program.globalNameContext.underlyingThings(Anything, name))
            result.add(thing.visit(cloner));
    }

    return result;
}

export { programWithUnnecessaryThingsRemoved as default };
