import { Cascader } from "antd";
import { useEffect, useState } from "react";
import './CascadeCheckbox.css';
import PropTypes from 'prop-types';


function CascadeCheckbox(props) {
    /**
     * outputTye: 
     * DEFAULT: default output from the antd Cascader,
     * LEAF_NODES: output only the end nodes in a single array
     */
    const {
        options,
        width,
        multiple,
        onChange,
        placeholder,
        outputType = "DEFAULT",
        handleClose = () => { },
        originalComponentOutput = () => { },
        value = null
    } = props;
    const { SHOW_CHILD } = Cascader;

    const [cascadeOptions, setCascadeOptions] = useState();
    const [widthStyle, setWidthStyle] = useState('100%');
    const [multipleState, setMultipleState] = useState(false);
    const [defaultValueArr, setDefaultValueArr] = useState(value ?? []);

    useEffect(() => {
        setCascadeOptions(options);
        mapDefaultValues(options);
        width && setWidthStyle(width);
        multiple && setMultipleState(multiple);
    }, [options, width, multiple]);

    function getPathsToDefaultTrue(node, path = []) {
        let result = [];
        const newPath = [...path, node.value];
        if (node.default === true) {
            result.push(newPath);
        }
        if (Array.isArray(node.children)) {
            for (let child of node.children) {
                result = result.concat(getPathsToDefaultTrue(child, newPath));
            }
        }
        return result;
    };

    function mapDefaultValues(optionsTree) {
        let pathsToDefaultTrue = [];
        optionsTree?.forEach(option => {
            pathsToDefaultTrue = pathsToDefaultTrue?.concat(getPathsToDefaultTrue(option));
        });
        setDefaultValueArr(pathsToDefaultTrue);
    };

    function onChangeHandler(selection) {
        setDefaultValueArr(selection);
        originalComponentOutput(selection);
        if (outputType === "LEAF_NODES") {
            selection = getLeafNodes(options, selection);
        }
        onChange(selection);
    };

    /**
     * logic to find the leaf nodes of the value array from tree
     * loop on value array, which is an array of arrays
     * using each element of the value array, which is also an array, find the selected nodes from the tree and store in an resultant array
     * iterating over the resultant array, find the leaf nodes and store in a final array
     */
    const getLeafNodes = (tree, values) => {
        let leafNodes = [];
        for (const value of values) {
            const selectedNodes = getSelectedNodes(tree, value);
            for (const node of selectedNodes) {
                leafNodes.push(...getLeafNode(node));
            }
        }
        return leafNodes;
    }

    const getSelectedNodes = (tree, value) => {
        let selectedNodes = [];
        for (let i = 0; i < value.length; i++) {
            const selectedValue = value[i];
            const node = tree.find((node) => node.value === selectedValue);
            if (node) {
                tree = node.children;
            }
            if (node.value === value[value.length - 1]) {
                selectedNodes.push(node);
            }
        }
        return selectedNodes;
    }

    const getLeafNode = (node) => {
        let leafNodes = [];
        const getLeafNodes = (node) => {
            if (node?.children) {
                for (const child of node.children) {
                    getLeafNodes(child);
                }
            } else if (node?.value) {
                leafNodes.push(node?.value);
            }
        };
        getLeafNodes(node);
        return leafNodes;
    };

    const filter = (inputValue, path) =>
        path.some((option) => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);

    return (
        <div id="cascade-container">
            <Cascader
                style={{
                    width: widthStyle,
                }}
                placeholder={placeholder}
                expandTrigger="hover"
                options={cascadeOptions}
                multiple={multipleState}
                showCheckedStrategy={SHOW_CHILD}
                maxTagCount="responsive"
                value={value ?? defaultValueArr}
                onChange={onChangeHandler}
                getPopupContainer={() => document.getElementById('cascade-container')}
                showSearch={{
                    filter,
                }}
                onDropdownVisibleChange={isOpen => handleClose(isOpen)}
            />
        </div>
    );
}

CascadeCheckbox.propTypes = {
    options: PropTypes.array.isRequired,
    width: PropTypes.string,
    multiple: PropTypes.bool,
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    outputType: PropTypes.oneOf(['DEFAULT', 'LEAF_NODES']),
}

export default CascadeCheckbox;

/**
 * The defaultValue prop in AntD is used only on first render, 
 * since useEffect runs after first render, you end up without a default value for the cascader.
 * Setting it afterwards does not have any effect.
 * If you want to use defaultValue, you can make sure that when cascader renders, you will already have set the default value.
*/ 