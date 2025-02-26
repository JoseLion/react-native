/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import type {RenderItemProps} from 'react-native/Libraries/Lists/VirtualizedList';
import type {
  ViewStyleProp,
  TextStyle,
} from 'react-native/Libraries/StyleSheet/StyleSheet';
import type {
  PlatformTestResult,
  PlatformTestResultStatus,
} from './RNTesterPlatformTestTypes';

import * as React from 'react';
import {useMemo, useState, useCallback} from 'react';
import {
  Button,
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const DISPLAY_STATUS_MAPPING: {[PlatformTestResultStatus]: string} = {
  PASS: 'Pass',
  FAIL: 'Fail',
  ERROR: 'Error',
};

type FilterModalProps = $ReadOnly<{
  filterText: string,
  setFilterText: (newFilterText: string) => void,
}>;
function FilterModalButton(props: FilterModalProps) {
  const {filterText, setFilterText} = props;

  const [modalVisible, setModalVisible] = useState(false);
  const [pendingFilterText, setPendingFilterText] = useState(filterText);

  const onFilterButtonPress = useCallback(() => {
    setPendingFilterText(filterText);
    setModalVisible(true);
  }, [filterText]);

  const onFilterSubmit = useCallback(() => {
    setFilterText(pendingFilterText);
    setModalVisible(false);
  }, [pendingFilterText, setFilterText]);

  const onFilterCancel = useCallback(() => {
    setModalVisible(false);
  }, []);

  const onPendingTextChange = useCallback(newText => {
    setPendingFilterText(newText);
  }, []);

  return (
    <>
      <Button title="Filter" onPress={onFilterButtonPress} />
      <Modal
        visible={modalVisible}
        animationType="fade"
        presentationStyle="overFullScreen"
        transparent={true}>
        <SafeAreaView style={styles.filterModalRoot}>
          <KeyboardAvoidingView
            style={styles.filterModalKeboardAvoidingRoot}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.filterModalContainer}>
              <View style={styles.filterModalContentContainer}>
                <View style={styles.filterModalPromptContainer}>
                  <Text style={styles.filterModalPromptText}>
                    Enter a test name filter
                  </Text>
                </View>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus={true}
                  style={styles.filterModalPendingTextInput}
                  value={pendingFilterText}
                  onChangeText={onPendingTextChange}
                  onSubmitEditing={onFilterSubmit}
                />
              </View>
              <View style={styles.filterModalActionsContainer}>
                <Button title="Cancel" onPress={onFilterCancel} />
                <Button title="Submit" onPress={onFilterSubmit} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function TableHeader() {
  return (
    <View style={styles.tableRow}>
      <View style={[styles.tableHeaderColumn, styles.tableResultColumn]}>
        <Text style={styles.tableHeader}>Result</Text>
      </View>
      <View style={[styles.tableHeaderColumn, styles.tableTestNameColumn]}>
        <Text style={styles.tableHeader}>Test Name</Text>
      </View>
      <View style={[styles.tableHeaderColumn, styles.tableMessageColumn]}>
        <Text style={styles.tableHeader}>Message</Text>
      </View>
    </View>
  );
}

const TableRow = React.memo(
  ({testResult}: {testResult: PlatformTestResult}) => {
    return (
      <View style={styles.tableRow}>
        <View style={styles.tableResultColumn}>
          <Text style={STATUS_TEXT_STYLE_MAPPING[testResult.status]}>
            {DISPLAY_STATUS_MAPPING[testResult.status]}
          </Text>
        </View>
        <View style={styles.tableTestNameColumn}>
          <Text>{testResult.name}</Text>
        </View>
        <View style={styles.tableMessageColumn}>
          {testResult.assertions.map((assertion, assertionIdx) => {
            if (assertion.passing) {
              return null;
            }
            return (
              <Text key={assertionIdx}>
                {assertion.name}: {assertion.description}{' '}
                {assertion.failureMessage}
              </Text>
            );
          })}
        </View>
      </View>
    );
  },
);

function renderTableRow({item}: RenderItemProps<PlatformTestResult>) {
  return <TableRow testResult={item} />;
}

type Props = $ReadOnly<{|
  numPending: number,
  reset: () => void,
  results: $ReadOnlyArray<PlatformTestResult>,
  style?: ?ViewStyleProp,
|}>;
export default function RNTesterPlatformTestResultView(
  props: Props,
): React.MixedElement {
  const {numPending, reset, results, style} = props;

  const [filterText, setFilterText] = useState('');

  const filteredResults = useMemo(() => {
    if (filterText === '') {
      return results;
    }
    return results.filter(result =>
      result.name.toLowerCase().includes(filterText.toLowerCase()),
    );
  }, [filterText, results]);

  const {numPass, numFail, numError} = useMemo(
    () =>
      filteredResults.reduce(
        (acc, result) => {
          switch (result.status) {
            case 'PASS':
              return {...acc, numPass: acc.numPass + 1};
            case 'FAIL':
              return {...acc, numFail: acc.numFail + 1};
            case 'ERROR':
              return {...acc, numError: acc.numError + 1};
          }
        },
        {
          numPass: 0,
          numFail: 0,
          numError: 0,
        },
      ),
    [filteredResults],
  );

  const handleReset = useCallback(() => {
    setFilterText('');
    reset();
  }, [reset]);

  return (
    <View style={style}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>
          Results
          {filterText !== '' ? (
            <>
              {' '}
              <Text style={styles.filteredText}>
                (Filtered: '{filterText}')
              </Text>
            </>
          ) : null}
        </Text>
        <View style={styles.actionsContainer}>
          <FilterModalButton
            filterText={filterText}
            setFilterText={setFilterText}
          />
          <View style={styles.buttonSpacer} />
          <Button title="Reset" onPress={handleReset} />
        </View>
      </View>

      <Text style={styles.summaryContainer}>
        <Text>
          {numPass} <Text style={styles.passText}>Pass</Text>
        </Text>
        {'  '}
        <Text>
          {numFail} <Text style={styles.failText}>Fail</Text>
        </Text>
        {'  '}
        <Text>
          {numError} <Text style={styles.errorText}>Error</Text>
        </Text>
        {numPending > 0 ? (
          <>
            {' '}
            <Text>
              {numPending} <Text style={styles.pendingText}>Pending</Text>
            </Text>
          </>
        ) : null}
      </Text>

      <View style={styles.table}>
        <TableHeader />
        <FlatList data={filteredResults} renderItem={renderTableRow} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
  },
  buttonSpacer: {
    width: 8,
  },
  errorText: {
    color: 'orange',
  },
  failText: {
    color: 'red',
  },
  filteredText: {
    fontSize: 18,
    fontWeight: 'normal',
    opacity: 0.5,
  },
  filterModalActionButton: {
    flex: 1,
  },
  filterModalActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    minHeight: 50,
  },
  filterModalContainer: {
    minWidth: 250,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  filterModalContentContainer: {
    paddingHorizontal: 12,
  },
  filterModalPromptContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterModalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  filterModalPromptText: {
    paddingVertical: 12,
    fontSize: 16,
  },
  filterModalPendingTextInput: {
    // height: 40,
    padding: 6,
    backgroundColor: 'white',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgb(171, 171, 171)',
    borderRadius: 8,
  },
  filterModalKeboardAvoidingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passText: {
    color: 'green',
  },
  pendingText: {
    color: 'gray',
  },
  table: {
    flex: 1,
  },
  tableHeader: {
    fontSize: 16,
    fontWeight: '700',
  },
  tableHeaderColumn: {
    alignItems: 'center',
  },
  tableMessageColumn: {
    flex: 2.5,
    justifyContent: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  tableResultColumn: {
    flex: 0.5,
    justifyContent: 'center',
  },
  tableTestNameColumn: {
    flex: 2,
    justifyContent: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
});

const STATUS_TEXT_STYLE_MAPPING: {[PlatformTestResultStatus]: TextStyle} = {
  PASS: styles.passText,
  FAIL: styles.failText,
  ERROR: styles.errorText,
};
