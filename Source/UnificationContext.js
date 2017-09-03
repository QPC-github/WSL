/*
 * Copyright (C) 2017 Apple Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. 
 */
"use strict";

class UnificationContext {
    constructor(typeParameters)
    {
        this._typeParameters = new Set(typeParameters);
        this._nextMap = new Map();
    }
    
    union(a, b)
    {
        a = this.find(a);
        b = this.find(b);
        if (a == b)
            return;
        
        if (!a.isUnifiable) {
            [a, b] = [b, a];
            if (!a.isUnifiable)
                throw new Error("Cannot unify non-unifiable things " + a + " and " + b);
        }
        
        // Make sure that type parameters don't end up being roots.
        if (a.isUnifiable && b.isUnifiable && this._typeParameters.has(b))
            [a, b] = [b, a];
        
        this._nextMap.set(a, b);
    }
    
    find(node)
    {
        let currentNode = node;
        let nextNode = this._nextMap.get(currentNode);
        if (!nextNode)
            return currentNode;
        for (;;) {
            currentNode = nextNode;
            nextNode = this._nextMap.get(currentNode);
            if (!nextNode)
                break;
        }
        this._nextMap.set(node, currentNode);
        return currentNode;
    }
    
    get nodes()
    {
        let result = new Set();
        for (let [key, value] of this._nextMap) {
            result.add(key);
            result.add(value);
        }
        return result;
    }
    
    typeParameters() { return this._typeParameters; }
    *typeArguments()
    {
        for (let typeArgument of this.nodes) {
            if (!typeArgument.isUnifiable)
                continue;
            if (this._typeParameters.has(typeArgument))
                continue;
            yield typeArgument;
        }
    }
    
    verify()
    {
        for (let typeParameter of this._typeParameters) {
            if (!typeParameter.verifyAsParameter(this))
                return false;
        }
        let numTypeVariableArguments = 0;
        let argumentSet = new Set();
        for (let typeArgument of this.typeArguments()) {
            if (!typeArgument.verifyAsArgument(this))
                return false;
            argumentSet.add(this.find(typeArgument));
            numTypeVariableArguments++;
        }
        return argumentSet.size == numTypeVariableArguments;
    }
    
    commit()
    {
        for (let typeArgument of this.typeArguments())
            typeArgument.commitUnification(this);
    }
}

