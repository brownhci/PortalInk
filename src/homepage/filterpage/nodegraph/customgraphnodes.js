import React from 'react';
import { Handle, Position } from 'react-flow-renderer';

const InputNode = ({ data }) => {
    return (
      <div>
        <div>{data.label}</div>
        <Handle
          id='a-out'
          type="source"
          position={Position.Bottom}
          style={{ borderRadius: 0 }}
        />
      </div>
    );
};

const DefaultNode = ({ data }) => {
    return (
      <div>
        <Handle id='a-in' type="target" position={Position.Top} style={{ borderRadius: 0 }} />
        <div>{data.label}</div>
        <Handle
          id='a-out'
          type="source"
          position={Position.Bottom}
          style={{ borderRadius: 0 }}
        />
      </div>
    );
};

const NoInputNode = ({ data }) => {
  return (
    <div>
      <div>{data.label}</div>
      <Handle
        id='a-out'
        type="source"
        position={Position.Bottom}
        style={{ borderRadius: 0 }}
      />
    </div>
  );
};

const TwoInputNode = ({ data }) => {
  return (
    <div>
      <Handle type="target" id='a-in' position={Position.Top} style={{ left: '30%', borderRadius: 0 }} />
      <Handle type="target" id='b-in' position={Position.Top} style={{ left: '70%', borderRadius: 0 }} />
      <div>{data.label}</div>
      <Handle
        type="source"
        id='a-out'
        position={Position.Bottom}
        style={{ borderRadius: 0 }}
      />
    </div>
  );
};

export const nodeTypes = {
    customInput: InputNode,
    customDefault: DefaultNode,
    twoInput: TwoInputNode,
    noInput: NoInputNode
};
  