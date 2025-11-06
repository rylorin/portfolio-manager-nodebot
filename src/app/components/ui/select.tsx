"use client";

import type { CollectionItem, ListCollection } from "@chakra-ui/react";
import { Select as ChakraSelect, Portal } from "@chakra-ui/react";
import * as React from "react";
import { CloseButton } from "./close-button";

type ItemType = { label: string; value: string }; // eslint-disable-line @typescript-eslint/consistent-type-definitions

interface SelectTriggerProps extends ChakraSelect.ControlProps {
  clearable?: boolean;
  placeholder: string;
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  function SelectTrigger(props, ref) {
    const { clearable, placeholder, ...rest } = props;
    return (
      <ChakraSelect.Control {...rest}>
        <ChakraSelect.Trigger ref={ref}>
          <SelectValueText placeholder={placeholder} />
        </ChakraSelect.Trigger>
        <ChakraSelect.IndicatorGroup>
          {clearable && <SelectClearTrigger />}
          <ChakraSelect.Indicator />
        </ChakraSelect.IndicatorGroup>
      </ChakraSelect.Control>
    );
  },
);

const SelectClearTrigger = React.forwardRef<HTMLButtonElement, ChakraSelect.ClearTriggerProps>(
  function SelectClearTrigger(props, ref) {
    return (
      <ChakraSelect.ClearTrigger asChild {...props} ref={ref}>
        <CloseButton size="xs" variant="plain" focusVisibleRing="inside" focusRingWidth="2px" pointerEvents="auto" />
      </ChakraSelect.ClearTrigger>
    );
  },
);

interface SelectContentProps extends ChakraSelect.ContentProps {
  portalled?: boolean;
  portalRef?: React.RefObject<HTMLElement>;
  collection: ListCollection;
}

export const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(function SelectContent(props, ref) {
  const { portalled = true, portalRef, collection, ...rest } = props;
  return (
    <Portal disabled={!portalled} container={portalRef}>
      <ChakraSelect.Positioner>
        <ChakraSelect.Content {...rest} ref={ref}>
          {collection &&
            collection.items.map((item: ItemType) => (
              <ChakraSelect.Item item={item} key={item.value}>
                <>
                  <ChakraSelect.ItemText>
                    {item.label === item.value ? item.value : `${item.label} (${item.value})`}
                  </ChakraSelect.ItemText>
                  <ChakraSelect.ItemIndicator />
                </>
              </ChakraSelect.Item>
            ))}
        </ChakraSelect.Content>
      </ChakraSelect.Positioner>
    </Portal>
  );
});

export const SelectItem = React.forwardRef<HTMLDivElement, ChakraSelect.ItemProps>(function SelectItem(props, ref) {
  const { item, children, ...rest } = props;
  return (
    <ChakraSelect.Item key={item.value} item={item} {...rest} ref={ref}>
      {children}
      <ChakraSelect.ItemIndicator />
    </ChakraSelect.Item>
  );
});

interface SelectValueTextProps extends Omit<ChakraSelect.ValueTextProps, "children"> {
  placeholder: string;
  children?(items: CollectionItem[]): React.ReactNode;
}

export const SelectValueText = React.forwardRef<HTMLSpanElement, SelectValueTextProps>(
  function SelectValueText(props, ref) {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { children: collection, ...rest } = props;
    return (
      <ChakraSelect.ValueText {...rest} ref={ref}>
        <ChakraSelect.Context>
          {(select): React.ReactNode => {
            const items = select.selectedItems as CollectionItem[];
            if (items.length === 0) return props.placeholder;
            if (collection) return collection(items);
            if (items.length === 1) return select.collection.stringifyItem(items[0]);
            return `${items.length} selected`;
          }}
        </ChakraSelect.Context>
      </ChakraSelect.ValueText>
    );
  },
);

export const SelectRoot = React.forwardRef<HTMLDivElement, ChakraSelect.RootProps>(function SelectRoot(props, ref) {
  return (
    <ChakraSelect.Root {...props} ref={ref} positioning={{ sameWidth: true, ...props.positioning }}>
      {props.asChild ? (
        props.children
      ) : (
        <>
          <ChakraSelect.HiddenSelect />
          {props.children}
        </>
      )}
    </ChakraSelect.Root>
  );
}) as ChakraSelect.RootComponent;

interface SelectItemGroupProps extends ChakraSelect.ItemGroupProps {
  label: React.ReactNode;
}

export const SelectItemGroup = React.forwardRef<HTMLDivElement, SelectItemGroupProps>(
  function SelectItemGroup(props, ref) {
    const { children, label, ...rest } = props;
    return (
      <ChakraSelect.ItemGroup {...rest} ref={ref}>
        <ChakraSelect.ItemGroupLabel>{label}</ChakraSelect.ItemGroupLabel>
        {children}
      </ChakraSelect.ItemGroup>
    );
  },
);

export const SelectLabel = ChakraSelect.Label;
export const SelectItemText = ChakraSelect.ItemText;

export function toArray<T extends { label: string; value: any }>(x: Record<string, unknown>): T[] {
  return Object.entries(x).reduce((p, v) => {
    const [label, value] = v;
    return [...p, { label, value } as T];
  }, [] as T[]);
}
