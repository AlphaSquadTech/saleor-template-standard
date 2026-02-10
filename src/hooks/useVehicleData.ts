import { shopApi } from "@/lib/api/shop";
import { useEffect, useState, useRef } from "react";

export interface VehicleOption {
  id: string | number;
  name: string;
  value: string;
}

export interface FitmentAPIType {
  id: number;
  value: string;
  name?: string;
}

export interface FitmentAPIMakesType {
  id: number;
  name: string;
  children?: FitmentAPIMakesType[];
}

interface DropdownLevel {
  typeId: number;
  typeName: string;
  values: FitmentAPIType[];
  selectedValue: string;
  selectedValueId: number;
}

export const useVehicleData = () => {
  const [rootTypes, setRootTypes] = useState<FitmentAPIMakesType[]>([]);
  const [selectedRootType, setSelectedRootType] = useState<number>(0);
  const [dropdownLevels, setDropdownLevels] = useState<DropdownLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [hierarchyStructure, setHierarchyStructure] = useState<
    FitmentAPIMakesType[]
  >([]);
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const findDeepestPath = (
    nodes: FitmentAPIMakesType[]
  ): FitmentAPIMakesType[] => {
    let deepestPath: FitmentAPIMakesType[] = [];
    let maxDepth = 0;

    const traverse = (
      node: FitmentAPIMakesType,
      currentPath: FitmentAPIMakesType[],
      depth: number
    ) => {
      const newPath = [...currentPath, { id: node.id, name: node.name }];

      if (!node.children || node.children.length === 0) {
        if (depth > maxDepth) {
          maxDepth = depth;
          deepestPath = newPath;
        }
      } else {
        node.children.forEach((child) => {
          traverse(child, newPath, depth + 1);
        });
      }
    };

    nodes.forEach((node) => {
      traverse(node, [], 1);
    });

    return deepestPath;
  };

  const flattenHierarchy = (
    node: FitmentAPIMakesType,
    result: FitmentAPIMakesType[] = []
  ): FitmentAPIMakesType[] => {
    result.push({ id: node.id, name: node.name });
    if (node.children && node.children.length > 0) {
      flattenHierarchy(node.children[0], result);
    }
    return result;
  };

  useEffect(() => {
    const fetchRootTypes = async () => {
      try {
        const response = await shopApi.getRootTypes();
        if (response?.data && response.data.length > 0) {
          setRootTypes(response.data);

          const typesWithChildren = response.data.filter(
            (type: FitmentAPIMakesType) =>
              type.children && type.children.length > 0
          );

          if (typesWithChildren.length > 0) {
            const deepestPath = findDeepestPath(typesWithChildren);

            if (deepestPath.length > 0) {
              setHierarchyStructure(deepestPath);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch root types:", error);
      }
    };
    fetchRootTypes();
  }, []);

  const getSelectedPairs = (): string => {
    return dropdownLevels
      .filter((level) => level.selectedValueId !== 0)
      .map((level) => `${level.typeId}:${level.selectedValueId}`)
      .join(",");
  };

  const getSelectedNames = (): string[] => {
    return dropdownLevels
      .filter((level) => level.selectedValueId !== 0)
      .map((level) => level.selectedValue);
  };

  const fetchValues = async (
    typeId: number,
    selectedPairs?: string
  ): Promise<FitmentAPIType[]> => {
    try {
      const query: number | string = selectedPairs
        ? `${typeId}?selected_pairs=${selectedPairs}`
        : typeId;

      const response = await shopApi.getFitmentValuesApi(query);

      if (response?.data) {
        return Array.isArray(response.data) ? response.data : [response.data];
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch values:", error);
      return [];
    }
  };

  const handleRootTypeChange = async (typeId: number) => {
    if (hierarchyStructure.length === 0) return;

    setSelectedRootType(typeId);
    setLoading(true);

    const levels: DropdownLevel[] = [];

    const firstLevel = hierarchyStructure[0];
    const values = await fetchValues(firstLevel.id);

    levels.push({
      typeId: firstLevel.id,
      typeName: firstLevel.name,
      values,
      selectedValue: "",
      selectedValueId: 0,
    });

    for (let i = 1; i < hierarchyStructure.length; i++) {
      levels.push({
        typeId: hierarchyStructure[i].id,
        typeName: hierarchyStructure[i].name,
        values: [],
        selectedValue: "",
        selectedValueId: 0,
      });
    }

    setDropdownLevels(levels);
    setLoading(false);
  };

  const handleValueChange = async (
    levelIndex: number,
    valueId: number,
    value: string
  ) => {
    setLoading(true);

    const updatedLevels = [...dropdownLevels];
    updatedLevels[levelIndex] = {
      ...updatedLevels[levelIndex],
      selectedValue: value,
      selectedValueId: valueId,
    };

    for (let i = levelIndex + 1; i < updatedLevels.length; i++) {
      updatedLevels[i] = {
        ...updatedLevels[i],
        values: [],
        selectedValue: "",
        selectedValueId: 0,
      };
    }

    const currentPairs = updatedLevels
      .slice(0, levelIndex + 1)
      .filter((level) => level.selectedValueId !== 0)
      .map((level) => `${level.typeId}:${level.selectedValueId}`)
      .join(",");

    setDropdownLevels(updatedLevels);

    const isLastLevel = levelIndex === hierarchyStructure.length - 1;

    if (isLastLevel) {
      setLoading(false);
      return;
    }

    const nextLevelIndex = levelIndex + 1;
    const nextLevel = hierarchyStructure[nextLevelIndex];
    const nextValues = await fetchValues(nextLevel.id, currentPairs);

    updatedLevels[nextLevelIndex] = {
      ...updatedLevels[nextLevelIndex],
      values: nextValues,
    };

    setDropdownLevels(updatedLevels);
    setLoading(false);
  };

  const initializeFromPairs = async (pairs: string) => {
    if (
      !pairs ||
      isInitializingRef.current ||
      hasInitializedRef.current ||
      hierarchyStructure.length === 0
    ) {
      return;
    }

    isInitializingRef.current = true;
    setLoading(true);

    try {
      const parsed = pairs.split(",").map((pair) => {
        const [typeId, valueId] = pair.split(":").map(Number);
        return { typeId, valueId };
      });

      const levels: DropdownLevel[] = [];

      for (let i = 0; i < hierarchyStructure.length; i++) {
        const hierarchyLevel = hierarchyStructure[i];

        const currentPairs = levels
          .filter((l) => l.selectedValueId !== 0)
          .map((level) => `${level.typeId}:${level.selectedValueId}`)
          .join(",");

        const values = await fetchValues(
          hierarchyLevel.id,
          currentPairs || undefined
        );

        const selectionForThisLevel = parsed.find(
          (p) => p.typeId === hierarchyLevel.id
        );

        if (selectionForThisLevel) {
          const selectedOption = values.find(
            (v) => v.id === selectionForThisLevel.valueId
          );

          if (selectedOption) {
            levels.push({
              typeId: hierarchyLevel.id,
              typeName: hierarchyLevel.name,
              values,
              selectedValue: selectedOption.value || selectedOption.name || "",
              selectedValueId: selectionForThisLevel.valueId,
            });
          } else {
            levels.push({
              typeId: hierarchyLevel.id,
              typeName: hierarchyLevel.name,
              values,
              selectedValue: "",
              selectedValueId: 0,
            });
            break;
          }
        } else {
          levels.push({
            typeId: hierarchyLevel.id,
            typeName: hierarchyLevel.name,
            values: i === 0 ? values : [],
            selectedValue: "",
            selectedValueId: 0,
          });

          for (let j = i + 1; j < hierarchyStructure.length; j++) {
            levels.push({
              typeId: hierarchyStructure[j].id,
              typeName: hierarchyStructure[j].name,
              values: [],
              selectedValue: "",
              selectedValueId: 0,
            });
          }
          break;
        }
      }

      setSelectedRootType(hierarchyStructure[0].id);
      setDropdownLevels(levels);
      hasInitializedRef.current = true;
    } catch (error) {
      console.error("Failed to initialize from pairs:", error);
    } finally {
      setLoading(false);
      isInitializingRef.current = false;
    }
  };

  const resetInitialization = () => {
    hasInitializedRef.current = false;
    setDropdownLevels([]);
    setSelectedRootType(0);
  };

  const isComplete =
    dropdownLevels.length > 0 &&
    dropdownLevels.every((level) => level.selectedValueId !== 0);

  return {
    rootTypes,
    selectedRootType,
    dropdownLevels,
    loading,
    handleRootTypeChange,
    handleValueChange,
    isComplete,
    getSelectedPairs,
    getSelectedNames,
    initializeFromPairs,
    resetInitialization,
  };
};
