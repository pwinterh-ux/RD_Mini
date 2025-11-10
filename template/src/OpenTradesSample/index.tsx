import React, {useMemo} from 'react';
import * as RN from 'react-native';
import {Types, Sleeper} from '@sleeperhq/mini-core';
import type {Player} from '@sleeperhq/mini-core/declarations/types';

type OwnProps = {
  context: Types.Context;
};

type TradeLine = {
  label: string;
};

type TradeItem = {
  leagueId: string;
  leagueName: string;
  transactionId: string;
  lines: TradeLine[];
};

const formatPlayerName = (player?: Player) => {
  if (!player) {
    return 'Unknown Player';
  }

  const firstInitial = player.first_name ? `${player.first_name[0]}. ` : '';
  return `${firstInitial}${player.last_name ?? ''}`.trim();
};

const OpenTradesSample = ({context}: OwnProps) => {
  const {
    userLeagueList = [],
    leaguesMap = {},
    transactionsInLeagueMap = {},
    transactionsMap = {},
    playersInSportMap = {},
    rostersInLeagueMap = {},
    userMap = {},
    actions = {},
  } = context;

  const openTrades = useMemo<TradeItem[]>(() => {
    return userLeagueList.flatMap(leagueId => {
      const league = leaguesMap[leagueId];
      if (!league) {
        return [];
      }

      const rosterMap = rostersInLeagueMap[leagueId] ?? {};
      const players = playersInSportMap[league.sport] ?? {};
      const transactionIds = transactionsInLeagueMap[leagueId] ?? [];

      return transactionIds
        .map(transactionId => transactionsMap[transactionId])
        .filter(
          transaction =>
            transaction?.type === 'trade' && transaction.status === 'proposed',
        )
        .map(transaction => {
          const rosterIds = transaction?.roster_ids ?? [];
          const lines: TradeLine[] = [];

          rosterIds.forEach(rosterId => {
            const roster = rosterMap?.[rosterId];
            const ownerName = roster?.owner_id
              ? userMap?.[roster.owner_id]?.display_name
              : undefined;
            const rosterLabel = ownerName
              ? `${ownerName}`
              : `Roster ${rosterId}`;

            const addedPlayers = Object.entries(transaction?.adds ?? {})
              .filter(([, targetRosterId]) => Number(targetRosterId) === Number(rosterId))
              .map(([playerId]) => formatPlayerName(players?.[playerId]));

            const droppedPlayers = Object.entries(transaction?.drops ?? {})
              .filter(([, targetRosterId]) => Number(targetRosterId) === Number(rosterId))
              .map(([playerId]) => formatPlayerName(players?.[playerId]));

            const segments: string[] = [];
            if (addedPlayers.length > 0) {
              segments.push(`+ ${addedPlayers.join(', ')}`);
            }
            if (droppedPlayers.length > 0) {
              segments.push(`- ${droppedPlayers.join(', ')}`);
            }

            if (segments.length > 0) {
              lines.push({label: `${rosterLabel}: ${segments.join(' | ')}`});
            }
          });

          if (lines.length === 0) {
            lines.push({label: 'No players changing hands were found.'});
          }

          return {
            leagueId,
            leagueName: league.name ?? leagueId,
            transactionId: transaction.transaction_id,
            lines,
          };
        });
    });
  }, [
    leaguesMap,
    playersInSportMap,
    rostersInLeagueMap,
    transactionsInLeagueMap,
    transactionsMap,
    userLeagueList,
    userMap,
  ]);

  const renderTrade = ({item}: {item: TradeItem}) => {
    return (
      <RN.View style={styles.tradeCard}>
        <Sleeper.Text style={styles.leagueName}>{item.leagueName}</Sleeper.Text>
        {item.lines.map(line => (
          <Sleeper.Text key={line.label} style={styles.tradeLine}>
            {line.label}
          </Sleeper.Text>
        ))}
        <Sleeper.Button
          text="View Trade"
          onPress={() =>
            actions.navigate?.('TradeCenterTransactionScreen', {
              leagueId: item.leagueId,
              transactionId: item.transactionId,
            })
          }
        />
      </RN.View>
    );
  };

  return (
    <RN.View style={styles.container}>
      <Sleeper.Text style={styles.header}>Open Trades</Sleeper.Text>
      {openTrades.length === 0 ? (
        <Sleeper.Text style={styles.emptyText}>
          No proposed trades detected across your leagues.
        </Sleeper.Text>
      ) : (
        <RN.FlatList
          data={openTrades}
          keyExtractor={item => `${item.leagueId}-${item.transactionId}`}
          contentContainerStyle={styles.listContent}
          renderItem={renderTrade}
        />
      )}
    </RN.View>
  );
};

const styles = RN.StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#101014',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  tradeCard: {
    backgroundColor: '#1c1c24',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2e2e3a',
  },
  leagueName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  tradeLine: {
    fontSize: 16,
    marginBottom: 4,
  },
});

export default OpenTradesSample;
